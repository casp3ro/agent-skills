---
title: Avoid default in Switches over Your Own Enums
impact: HIGH
impactDescription: new cases surface as compile errors
tags: modeling, enum, switch, exhaustiveness
---

## Avoid default in Switches over Your Own Enums

**Impact: HIGH (new cases surface as compile errors)**

`switch` must be exhaustive. When you list every case of your own enum, adding a case later breaks the build at every switch that needs updating. A `default:` branch silently swallows the new case. Keep `default` for open sets (integers, strings) and use `@unknown default` for enums from frameworks that may add cases.

**Incorrect (new `refunded` case silently falls into default):**

```swift
enum PaymentStatus {
    case pending, paid, failed, refunded
}

func badgeColor(for status: PaymentStatus) -> String {
    switch status {
    case .paid: "green"
    case .failed: "red"
    default: "gray" // refunded is shown as pending-gray, no warning
    }
}
```

**Correct (exhaustive over own cases; @unknown default for framework enums):**

```swift
import UserNotifications

func badgeColor(for status: PaymentStatus) -> String {
    switch status {
    case .pending: "gray"
    case .paid: "green"
    case .failed: "red"
    case .refunded: "blue"
    }
}

func describe(_ status: UNAuthorizationStatus) -> String {
    switch status {
    case .authorized: "Allowed"
    case .denied: "Denied"
    case .notDetermined: "Not asked yet"
    case .provisional, .ephemeral: "Limited"
    @unknown default: "Unknown"
    }
}
```

Reference: [Switch](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Switch)
