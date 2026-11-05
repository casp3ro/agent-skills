---
title: Use Strongly Typed Identifiers
impact: HIGH
impactDescription: mixed-up IDs become compile errors
tags: modeling, identifiers, phantom-types, codable
---

## Use Strongly Typed Identifiers

**Impact: HIGH (mixed-up IDs become compile errors)**

Swift typing is nominal: two types with the same shape are still different types. Use that to stop passing a user ID where an order ID is expected. A generic `Tagged` wrapper with a phantom tag gives every entity its own ID type at zero runtime cost. Implement `Codable` as a single value so the JSON stays a plain string or UUID.

**Incorrect (all identifiers are raw UUIDs):**

```swift
import Foundation

func cancel(orderID: UUID) async throws { /* ... */ }

let userID = UUID()
try await cancel(orderID: userID) // compiles, cancels the wrong thing
```

**Correct (one ID type per entity):**

```swift
import Foundation

struct Tagged<Tag, RawValue: Hashable & Sendable>: Hashable, Sendable {
    let rawValue: RawValue
    init(_ rawValue: RawValue) { self.rawValue = rawValue }
}

extension Tagged: Codable where RawValue: Codable {
    init(from decoder: any Decoder) throws {
        rawValue = try decoder.singleValueContainer().decode(RawValue.self)
    }
    func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

struct User: Identifiable, Hashable, Codable, Sendable {
    typealias ID = Tagged<User, UUID>
    let id: ID
    var name: String
}

struct Order: Identifiable, Hashable, Codable, Sendable {
    typealias ID = Tagged<Order, UUID>
    let id: ID
    var total: Decimal
}

func cancel(orderID: Order.ID) async throws { /* ... */ }
// cancel(orderID: user.id) — compile error: User.ID is not Order.ID
```

The tag type parameter is never stored, so `Hashable` and `Sendable` synthesis do not require anything of `Tag`. The `swift-tagged` package from Point-Free provides a production-ready version.

Reference: [Value and Reference Types](https://www.swift.org/documentation/articles/value-and-reference-types.html)
