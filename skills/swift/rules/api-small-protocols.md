---
title: Design Small Protocols with Default Implementations
impact: MEDIUM
impactDescription: easy conformance, easy fakes
tags: api, protocols, extensions, protocol-oriented
---

## Design Small Protocols with Default Implementations

**Impact: MEDIUM (easy conformance, easy fakes)**

Swift protocols differ from TypeScript interfaces: conformance is explicit (nominal), protocols can carry default implementations in extensions, and you can conform existing types retroactively. Keep each protocol focused on one capability so fakes are trivial, and put shared behavior in protocol extensions instead of base classes.

**Incorrect (one fat protocol; every fake implements twenty methods):**

```swift
protocol BackendService {
    func login(email: String, password: String) async throws -> Session
    func logout() async throws
    func users() async throws -> [User]
    func orders() async throws -> [Order]
    func uploadAvatar(_ data: Data) async throws
    // ...15 more
}
```

**Correct (capability-sized protocols, shared behavior in an extension):**

```swift
import Foundation

protocol OrdersRepository: Sendable {
    func orders(page: Int) async throws -> [Order]
}

extension OrdersRepository {
    /// Default implementation available to every conforming type.
    func allOrders(maxPages: Int = 10) async throws -> [Order] {
        var result: [Order] = []
        for page in 0..<maxPages {
            let batch = try await orders(page: page)
            if batch.isEmpty { break }
            result += batch
        }
        return result
    }
}

struct InMemoryOrdersRepository: OrdersRepository {
    let pages: [[Order]]
    func orders(page: Int) async throws -> [Order] {
        page < pages.count ? pages[page] : []
    }
}
```

Reference: [Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)
