---
title: Register for Push and Handle Delegate Callbacks Off the Main Actor
impact: MEDIUM
impactDescription: correct token registration and notification routing
tags: realtime, push, apns, usernotifications, delegates
---

## Register for Push and Handle Delegate Callbacks Off the Main Actor

**Impact: MEDIUM (correct token registration and notification routing)**

Request authorization, register with APNs, and send the hex-encoded device token to your backend, which stores it per user and sends pushes with an APNs auth key (.p8). In a SwiftUI app, hook into the app delegate with `@UIApplicationDelegateAdaptor` (`@NSApplicationDelegateAdaptor` on macOS). `UNUserNotificationCenterDelegate` callbacks are not guaranteed to arrive on the main actor: implement them `nonisolated`, extract `Sendable` values, then hop to the main actor.

**Incorrect (token never sent; main-actor state mutated from a nonisolated callback):**

```swift
import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var lastOrderID: String?

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print(deviceToken) // prints "32 bytes"; backend never learns the token
    }
}
```

**Correct (coordinator with nonisolated delegate methods; token forwarded):**

```swift
import SwiftUI
import UserNotifications

@MainActor
final class PushCoordinator: NSObject, UNUserNotificationCenterDelegate {
    var onDeviceToken: ((String) -> Void)?
    var onOpenOrder: ((String) -> Void)?

    func requestAuthorization() async throws -> Bool {
        try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
    }

    func didRegister(deviceToken: Data) {
        onDeviceToken?(deviceToken.map { String(format: "%02x", $0) }.joined())
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        guard let orderID = response.notification.request.content.userInfo["order_id"] as? String else { return }
        await openOrder(orderID)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    private func openOrder(_ orderID: String) {
        onOpenOrder?(orderID)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    let push = PushCoordinator()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = push
        application.registerForRemoteNotifications()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        push.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        // Simulator without APNs support, missing entitlement, or no network: log it.
    }
}

@main
struct ShopApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var router = Router()
    private let devices = DevicesAPI.live // your backend client: POST /v1/devices

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(router)
                .task {
                    appDelegate.push.onOpenOrder = { rawID in
                        guard let uuid = UUID(uuidString: rawID) else { return }
                        router.open(.orderDetail(Order.ID(uuid)))
                    }
                    appDelegate.push.onDeviceToken = { token in
                        Task {
                            do {
                                try await devices.register(token: token)
                            } catch {
                                // Registration is retried on the next launch.
                            }
                        }
                    }
                    do {
                        _ = try await appDelegate.push.requestAuthorization()
                    } catch {
                        // Authorization request failed; the app keeps working without push.
                    }
                }
        }
    }
}
```

Enable the Push Notifications capability (and Background Modes → Remote notifications for silent pushes). Silent pushes (`content-available: 1`) are throttled by the system: treat them as hints, not guaranteed delivery.

Reference: [Registering your app with APNs](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)
