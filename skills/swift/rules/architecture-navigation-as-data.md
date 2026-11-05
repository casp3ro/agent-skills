---
title: Model Navigation as Data
impact: MEDIUM
impactDescription: deep links and state restoration for free
tags: architecture, navigation, navigationstack, deep-links
---

## Model Navigation as Data

**Impact: MEDIUM (deep links and state restoration for free)**

Drive `NavigationStack` with a path of `Hashable` route values and resolve destinations in one `navigationDestination(for:)`. Deep links, push notifications, and state restoration then become "append a route". Avoid `NavigationLink(destination:)` with eagerly built destination views scattered across screens.

**Incorrect (destinations wired inline; nothing can navigate programmatically):**

```swift
import SwiftUI

struct HomeView: View {
    let orders: [Order]

    var body: some View {
        NavigationStack {
            List(orders) { order in
                NavigationLink(destination: OrderDetailView(orderID: order.id)) {
                    Text(order.title)
                }
            }
        }
    }
}
```

**Correct (routes as values, a router model, one destination switch):**

```swift
import SwiftUI

enum Route: Hashable {
    case orderDetail(Order.ID)
    case settings
}

@MainActor
@Observable
final class Router {
    var path: [Route] = []

    func open(_ route: Route) { path.append(route) }
    func popToRoot() { path.removeAll() }
}

struct RootView: View {
    @State private var router = Router()
    let orders: [Order]

    var body: some View {
        NavigationStack(path: $router.path) {
            List(orders) { order in
                NavigationLink(value: Route.orderDetail(order.id)) { Text(order.title) }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .orderDetail(let id): OrderDetailView(orderID: id)
                case .settings: SettingsView()
                }
            }
        }
        .environment(router)
        .onOpenURL { url in
            if let id = Order.ID(deepLink: url) { router.open(.orderDetail(id)) } // your URL parser
        }
    }
}
```

Reference: [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)
