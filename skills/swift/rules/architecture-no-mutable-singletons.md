---
title: Avoid Mutable Singletons
impact: HIGH
impactDescription: removes hidden dependencies and global races
tags: architecture, singletons, global-state, testing
---

## Avoid Mutable Singletons

**Impact: HIGH (removes hidden dependencies and global races)**

`static let shared` holding mutable state is a hidden global: any code can change it, tests interfere with each other (Swift Testing runs tests in parallel), and in Swift 6 a non-Sendable global is a compile error. Inject the dependency instead. If the state is genuinely app-wide and shared across tasks, own one instance in the composition root and make it an actor or `@MainActor`.

**Incorrect (global mutable session reached from anywhere):**

```swift
final class Session {
    static let shared = Session() // Swift 6: "not concurrency-safe" error in nonisolated modules
    var currentUser: User?
    var authToken: String?
}

struct ProfileRepository {
    func load() async throws -> Profile {
        guard let token = Session.shared.authToken else { throw AuthError.signedOut }
        return try await fetchProfile(token: token)
    }
}
```

**Correct (isolated state, created once at the root, injected):**

```swift
actor SessionStore {
    private(set) var currentUser: User?
    private(set) var authToken: String?

    func signIn(user: User, token: String) {
        currentUser = user
        authToken = token
    }

    func signOut() {
        currentUser = nil
        authToken = nil
    }
}

struct ProfileRepository: Sendable {
    let session: SessionStore

    func load() async throws -> Profile {
        guard let token = await session.authToken else { throw AuthError.signedOut }
        return try await fetchProfile(token: token)
    }
}
```

Stateless singletons of `Sendable` types (`URLSession.shared`, a `Logger`) are fine.

Reference: [Swift 6 Migration Guide: Global Variables](https://www.swift.org/migration/documentation/migrationguide)
