---
title: Receive Webhooks on the Server, Then Notify the App
impact: HIGH
impactDescription: reliable real-time updates without polling
tags: realtime, webhooks, push, architecture, backend
---

## Receive Webhooks on the Server, Then Notify the App

**Impact: HIGH (reliable real-time updates without polling)**

A webhook is an HTTP POST from a third party (Stripe, GitHub, Paddle) to a public server URL. An iOS or macOS app has no public address and may be suspended or offline, so it cannot receive webhooks. Ingest webhooks in your backend (Node, or Swift with Vapor), persist the result, then notify the app: APNs push when it may be in the background, WebSocket or SSE when it is open. The app always re-fetches authoritative state from your API.

```text
Provider ──webhook──▶ Backend ──▶ database (source of truth)
                         ├──▶ APNs push ──▶ app (alert or silent refresh)
                         └──▶ WebSocket/SSE ──▶ app (while open)
App ──GET /v1/orders/{id}──▶ Backend
```

**Incorrect (app polls the provider on a timer with an embedded secret key):**

```swift
import Foundation

@MainActor
final class PaymentStatusModel {
    var status = "pending"
    private var timer: Timer?

    func start(paymentID: String) {
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in
            Task { @MainActor in
                // Secret API key shipped in the app; battery drain; misses updates while suspended.
                self.status = try await StripeDirect(secretKey: "sk_live_...").status(of: paymentID)
            }
        }
    }
}
```

**Correct (server ingests the webhook; app reacts to push or socket and re-fetches):**

```swift
import Foundation
import Observation

@MainActor
@Observable
final class PaymentStatusModel {
    private(set) var status: PaymentStatus = .pending
    private let repository: any PaymentsRepository

    init(repository: any PaymentsRepository) {
        self.repository = repository
    }

    /// Called when a push notification or socket event says this payment changed.
    func paymentDidChange(id: Payment.ID) async {
        do {
            status = try await repository.payment(id: id).status // the API is the source of truth
        } catch {
            // Keep the last known state; the next event or screen refresh will retry.
        }
    }
}

protocol PaymentsRepository: Sendable {
    func payment(id: Payment.ID) async throws -> Payment
}
```

Reference: [Setting up a remote notification server](https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server)
