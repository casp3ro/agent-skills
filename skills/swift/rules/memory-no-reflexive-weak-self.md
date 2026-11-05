---
title: Do Not Add weak self to Non-Escaping Closures
impact: LOW-MEDIUM
impactDescription: less noise, no accidental early exits
tags: memory, closures, weak, readability
---

## Do Not Add weak self to Non-Escaping Closures

**Impact: LOW-MEDIUM (less noise, no accidental early exits)**

Closures that run immediately and are not stored (`map`, `filter`, `sorted`, `withAnimation`, SwiftUI view builders) cannot create a retain cycle. Adding `[weak self]` there is noise and can skip work if you bail out with `guard let self else { return }`. Short-lived `Task { }` closures hold `self` only until they finish, which is usually fine; long-running tasks should be cancelled instead (see `concurrency-structured-tasks`).

**Incorrect (weak capture where no cycle is possible):**

```swift
@MainActor
final class CartModel {
    var items: [CartItem] = []

    var total: Decimal {
        items.reduce(0) { [weak self] sum, item in
            guard let self else { return sum } // pointless
            return sum + item.price * Decimal(item.quantity) + self.fee(for: item)
        }
    }

    func fee(for item: CartItem) -> Decimal { 0 }
}
```

**Correct (plain capture in non-escaping closures):**

```swift
@MainActor
final class CartModel {
    var items: [CartItem] = []

    var total: Decimal {
        items.reduce(0) { sum, item in
            sum + item.price * Decimal(item.quantity) + fee(for: item)
        }
    }

    func fee(for item: CartItem) -> Decimal { 0 }
}
```

Reference: [Escaping Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/#Escaping-Closures)
