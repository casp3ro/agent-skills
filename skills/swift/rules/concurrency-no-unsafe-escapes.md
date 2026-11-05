---
title: Do Not Silence Sendable Errors with Unsafe Escapes
impact: CRITICAL
impactDescription: keeps the compiler's race detection intact
tags: concurrency, sendable, unchecked, safety
---

## Do Not Silence Sendable Errors with Unsafe Escapes

**Impact: CRITICAL (keeps the compiler's race detection intact)**

A Sendable or isolation error is a data race the compiler found for you. `@unchecked Sendable`, `nonisolated(unsafe)`, and `@preconcurrency import` turn the check off without fixing anything. Fix the design instead: make the type a value type, make it immutable, move the state into an actor, or keep it on the main actor. Use an unsafe escape only when you have real synchronization, and document it.

**Incorrect (mutable class marked Sendable to make an error go away):**

```swift
final class SessionState: @unchecked Sendable {
    var userID: String?     // mutated from several tasks, no synchronization
    var isRefreshing = false
}

nonisolated(unsafe) var sharedSession = SessionState()
```

**Correct (immutable value type, or real synchronization documented):**

```swift
import Synchronization

// Option 1: an immutable value type is Sendable automatically.
struct SessionSnapshot: Sendable {
    let userID: String?
    let isRefreshing: Bool
}

// Option 2: state that must be shared lives in an actor.
actor SessionStore {
    private(set) var snapshot = SessionSnapshot(userID: nil, isRefreshing: false)
    func update(_ newValue: SessionSnapshot) { snapshot = newValue }
}

// Option 3: synchronous access with a real lock (iOS 18 / macOS 15).
final class Counter: Sendable {
    private let value = Mutex(0) // Mutex is Sendable; access is synchronized
    func increment() -> Int {
        value.withLock { count in
            count += 1
            return count
        }
    }
}
```

Reference: [Swift 6 Migration Guide: Common Problems](https://www.swift.org/migration/documentation/migrationguide)
