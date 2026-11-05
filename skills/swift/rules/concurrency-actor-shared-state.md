---
title: Protect Shared Mutable State with an Actor
impact: CRITICAL
impactDescription: eliminates data races without locks
tags: concurrency, actor, shared-state, cache
---

## Protect Shared Mutable State with an Actor

**Impact: CRITICAL (eliminates data races without locks)**

When mutable state is accessed from several tasks or isolation domains (a cache, a session, a token store, a connection registry), put it in an `actor`. The actor runs one task at a time on its state, so no locks are needed, and the compiler forces callers to `await`. Do not make every service an actor: stateless services should be `Sendable` structs, and UI state belongs on `@MainActor`.

**Incorrect (class with a dictionary mutated from concurrent tasks):**

```swift
final class ImageCache {
    private var storage: [URL: Data] = [:] // concurrent reads and writes race

    func data(for url: URL) -> Data? { storage[url] }
    func insert(_ data: Data, for url: URL) { storage[url] = data }
}
```

**Correct (actor serializes access, callers await):**

```swift
import Foundation

actor ImageCache {
    private var storage: [URL: Data] = [:]
    private let limit: Int

    init(limit: Int = 200) {
        self.limit = limit
    }

    func data(for url: URL) -> Data? {
        storage[url]
    }

    func insert(_ data: Data, for url: URL) {
        if storage.count >= limit, let firstKey = storage.keys.first {
            storage[firstKey] = nil
        }
        storage[url] = data
    }

    nonisolated var debugName: String { "ImageCache" } // no state access, no await needed
}

// Usage from any context
func cachedImage(_ url: URL, cache: ImageCache) async -> Data? {
    await cache.data(for: url)
}
```

If you need a synchronous critical section (for example inside a non-async API), use `Mutex` from the `Synchronization` module (iOS 18 / macOS 15) instead of building an actor around a lock.

Reference: [Swift Concurrency: Actors](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Actors)
