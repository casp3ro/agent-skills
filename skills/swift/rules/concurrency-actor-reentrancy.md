---
title: Do Not Assume Actor State Survives an Await
impact: HIGH
impactDescription: prevents duplicate work and stale-state bugs
tags: concurrency, actor, reentrancy, deduplication
---

## Do Not Assume Actor State Survives an Await

**Impact: HIGH (prevents duplicate work and stale-state bugs)**

Actors are reentrant. At every `await` inside an actor method, other callers can run and change the actor's state. Check-then-await-then-write sequences break: two callers both see "no token", both start a refresh, and the second overwrites the first. Record in-flight work before the first `await` so later callers join it.

**Incorrect (concurrent callers each start their own refresh):**

```swift
actor TokenStore {
    private var token: String?

    func validToken(refresh: @Sendable () async throws -> String) async throws -> String {
        if let token { return token }
        let newToken = try await refresh() // other callers enter here and refresh again
        token = newToken
        return newToken
    }
}
```

**Correct (store the in-flight task before suspending; everyone awaits the same task):**

```swift
actor TokenStore {
    private var token: String?
    private var refreshTask: Task<String, any Error>?

    func validToken(
        refresh: @escaping @Sendable () async throws -> String
    ) async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    func invalidate() {
        token = nil
    }
}
```

General rule: after any `await` inside an actor, re-read state instead of trusting values read before the suspension.

Reference: [SE-0306 Actors: Actor reentrancy](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md#actor-reentrancy)
