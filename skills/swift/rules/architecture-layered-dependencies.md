---
title: Keep the Domain Layer Free of UI and Transport
impact: HIGH
impactDescription: domain logic testable in milliseconds
tags: architecture, layers, domain, clean-architecture
---

## Keep the Domain Layer Free of UI and Transport

**Impact: HIGH (domain logic testable in milliseconds)**

Dependencies point inward: views depend on feature models, feature models depend on domain protocols, and the data layer implements those protocols. The domain layer (entities, business rules, repository protocols) imports only Foundation: no SwiftUI, no URLSession, no SwiftData. Map domain values to UI concepts (colors, icons, strings) in the UI layer.

```text
View (SwiftUI)  →  Feature model (@Observable, @MainActor)
                         ↓ protocol
                   Domain (structs, enums, protocols, rules)
                         ↑ implements
                   Data (HTTP client, persistence, repositories)
```

**Incorrect (domain entity imports SwiftUI and knows about colors):**

```swift
import SwiftUI

struct Subscription {
    let plan: String
    let renewsAt: Date
    var badgeColor: Color { plan == "pro" ? .purple : .gray }
}
```

**Correct (pure domain; UI mapping lives in the UI module):**

```swift
// Domain module
import Foundation

enum Plan: String, Codable, Sendable { case free, pro, team }

struct Subscription: Sendable, Equatable {
    let plan: Plan
    let renewsAt: Date
    let autoRenew: Bool

    func isExpiring(within days: Int, now: Date = .now) -> Bool {
        renewsAt.timeIntervalSince(now) < Double(days) * 86_400
    }
}

// DesignSystem or feature module
import SwiftUI

extension Plan {
    var badgeColor: Color {
        switch self {
        case .free: .gray
        case .pro: .purple
        case .team: .blue
        }
    }
}
```

Name the pattern however you like (MV, MVVM): the layering is what matters. TCA (The Composable Architecture) is a valid heavier option for large teams once the fundamentals are solid.

Reference: [Value and Reference Types](https://www.swift.org/documentation/articles/value-and-reference-types.html)
