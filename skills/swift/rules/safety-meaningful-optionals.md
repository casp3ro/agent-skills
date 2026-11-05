---
title: Use Optionals Only When Absence Is Meaningful
impact: MEDIUM
impactDescription: fewer unwraps, clearer domain
tags: safety, optionals, modeling, initializers
---

## Use Optionals Only When Absence Is Meaningful

**Impact: MEDIUM (fewer unwraps, clearer domain)**

A non-optional value can never be `nil`; the compiler guarantees it. Making properties optional "just in case" spreads unwrapping (and force-unwrapping) through the codebase and hides which values really can be missing. Make a property optional only when "not present" is a real state in the domain, and require everything else in the initializer.

**Incorrect (everything optional, set later, unwrapped everywhere):**

```swift
import Foundation

final class Invoice {
    var id: UUID?
    var number: String?
    var issuedAt: Date?
    var paidAt: Date?
}

func label(for invoice: Invoice) -> String {
    "Invoice \(invoice.number!) issued \(invoice.issuedAt!)"
}
```

**Correct (required data is required; only paidAt can be absent):**

```swift
import Foundation

struct Invoice: Identifiable, Sendable {
    let id: UUID
    let number: String
    let issuedAt: Date
    var paidAt: Date? // nil means "not paid yet": a real domain state

    var isPaid: Bool { paidAt != nil }
}

func label(for invoice: Invoice) -> String {
    "Invoice \(invoice.number) issued \(invoice.issuedAt.formatted(date: .abbreviated, time: .omitted))"
}
```

Reference: [The Basics: Optionals](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/#Optionals)
