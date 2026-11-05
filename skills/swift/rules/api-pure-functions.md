---
title: Keep Logic in Small Pure Functions, Effects at the Edges
impact: MEDIUM
impactDescription: logic testable without mocks
tags: api, functions, purity, async, testing
---

## Keep Logic in Small Pure Functions, Effects at the Edges

**Impact: MEDIUM (logic testable without mocks)**

Put business rules in small synchronous functions over value types (input → output). Keep side effects (network, disk, clock, UI) in thin async layers that call those functions. Mark a function `async` only if it actually awaits, `throws` only if it can fail, and make methods that do not use `self` `static`. Inject the current date instead of calling `Date()` inside logic.

**Incorrect (rules, I/O, and clock tangled in one async method):**

```swift
import Foundation

@MainActor
final class SubscriptionModel {
    var banner = ""
    let api: SubscriptionAPI

    init(api: SubscriptionAPI) { self.api = api }

    func refresh() async throws {
        let sub = try await api.subscription()
        if sub.plan == "pro" && sub.renewsAt.timeIntervalSince(Date()) < 3 * 86_400 && !sub.autoRenew {
            banner = "Your Pro plan expires soon"
        } else {
            banner = ""
        }
    }
}
```

**Correct (pure rule plus thin effectful wrapper):**

```swift
import Foundation
import Observation

enum RenewalBanner {
    static func message(for subscription: Subscription, now: Date) -> String? {
        guard subscription.plan == .pro, !subscription.autoRenew else { return nil }
        let threeDays: TimeInterval = 3 * 86_400
        return subscription.renewsAt.timeIntervalSince(now) < threeDays ? "Your Pro plan expires soon" : nil
    }
}

@MainActor
@Observable
final class SubscriptionModel {
    private(set) var banner: String?
    private let api: any SubscriptionAPI
    private let now: @Sendable () -> Date

    init(api: any SubscriptionAPI, now: @escaping @Sendable () -> Date = { Date() }) {
        self.api = api
        self.now = now
    }

    func refresh() async throws {
        let subscription = try await api.subscription()
        banner = RenewalBanner.message(for: subscription, now: now())
    }
}
```

`RenewalBanner.message(for:now:)` can be tested with plain values in microseconds, no fakes required.

Reference: [Functions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/)
