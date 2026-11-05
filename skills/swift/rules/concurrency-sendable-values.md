---
title: Pass Value Types Across Isolation Boundaries
impact: HIGH
impactDescription: Sendable by construction, no copies to synchronize
tags: concurrency, sendable, struct, boundaries
---

## Pass Value Types Across Isolation Boundaries

**Impact: HIGH (Sendable by construction, no copies to synchronize)**

Data that moves between the main actor, actors, and background functions must be `Sendable`. Structs and enums whose stored properties are `Sendable` qualify automatically (public types need an explicit `: Sendable`). Classes with mutable state do not. Model data crossing boundaries as value types: DTOs, snapshots, identifiers. Never pass framework objects that are tied to one context, such as SwiftData `@Model` instances.

**Incorrect (mutable reference type sent to a background function):**

```swift
final class Draft {
    var title = ""
    var body = ""
}

nonisolated struct Uploader {
    @concurrent
    func upload(_ draft: Draft) async throws { /* ... */ } // Draft is not Sendable
}
```

**Correct (immutable value type crosses the boundary):**

```swift
import Foundation

struct DraftPayload: Sendable, Codable {
    let title: String
    let body: String
}

nonisolated struct Uploader {
    @concurrent
    func upload(_ draft: DraftPayload) async throws -> Data {
        try JSONEncoder().encode(draft)
    }
}
```

When an object must stay a class, convert it to a snapshot struct at the boundary (`draft.payload`) instead of sending the object itself.

Reference: [Sendable](https://developer.apple.com/documentation/swift/sendable)
