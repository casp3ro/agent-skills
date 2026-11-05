---
title: Make Impossible States Unrepresentable with Enums
impact: CRITICAL
impactDescription: removes invalid state combinations
tags: modeling, enum, state, associated-values
---

## Make Impossible States Unrepresentable with Enums

**Impact: CRITICAL (removes invalid state combinations)**

Several booleans and optionals that describe one state (`isLoading`, `error`, `data`) allow combinations that make no sense, such as loading with an error and data at the same time. An enum with associated values (Swift's discriminated union) allows only the legal states, and `switch` forces every state to be handled.

**Incorrect (8 combinations, 5 of them invalid):**

```swift
@MainActor
@Observable
final class OrdersModel {
    var isLoading = false
    var error: (any Error)?
    var orders: [Order]?
}
```

**Correct (one enum, exactly the legal states):**

```swift
enum LoadState<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(any Error)
}

@MainActor
@Observable
final class OrdersModel {
    private(set) var state: LoadState<[Order]> = .idle
}

func title(for state: LoadState<[Order]>) -> String {
    switch state {
    case .idle: "Pull to refresh"
    case .loading: "Loading…"
    case .loaded(let orders) where orders.isEmpty: "No orders yet"
    case .loaded(let orders): "\(orders.count) orders"
    case .failed(let error): "Error: \(error.localizedDescription)"
    }
}
```

An enum with no cases (`enum API {}`) is the idiomatic namespace for static constants and functions because it cannot be instantiated.

Reference: [Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)
