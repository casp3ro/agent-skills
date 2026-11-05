---
title: Mark Classes final and Prefer Composition
impact: MEDIUM
impactDescription: static dispatch and simpler reasoning
tags: modeling, class, final, inheritance, composition
---

## Mark Classes final and Prefer Composition

**Impact: MEDIUM (static dispatch and simpler reasoning)**

Unless a class is designed for subclassing, mark it `final`. It enables static dispatch, makes `Sendable` conformance possible for immutable classes, and documents intent. Share behavior through protocols and composition (wrapping one implementation in another) instead of inheritance hierarchies.

**Incorrect (inheritance chain for behavior reuse):**

```swift
class BaseRepository {
    func log(_ message: String) { print(message) }
}

class UserRepository: BaseRepository {
    func user(id: String) async throws -> User { /* ... */ fatalError() }
}

class CachedUserRepository: UserRepository { /* overrides everything */ }
```

**Correct (protocol plus composable final types):**

```swift
protocol UserRepository: Sendable {
    func user(id: User.ID) async throws -> User
}

struct RemoteUserRepository: UserRepository {
    let client: HTTPClient
    func user(id: User.ID) async throws -> User {
        try User(dto: await client.send(UsersEndpoints.user(id: id)))
    }
}

struct CachedUserRepository: UserRepository {
    let wrapped: any UserRepository
    let cache: UserCache // actor

    func user(id: User.ID) async throws -> User {
        if let cached = await cache.user(id: id) { return cached }
        let user = try await wrapped.user(id: id)
        await cache.store(user)
        return user
    }
}
```

Reference: [Inheritance](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/inheritance/)
