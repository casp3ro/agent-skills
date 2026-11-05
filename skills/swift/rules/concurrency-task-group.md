---
title: Use Task Groups for Dynamic Fan-Out
impact: HIGH
impactDescription: parallelism with cancellation and backpressure
tags: concurrency, taskgroup, parallel, rate-limit
---

## Use Task Groups for Dynamic Fan-Out

**Impact: HIGH (parallelism with cancellation and backpressure)**

For a variable number of parallel operations use `withThrowingTaskGroup`. Child tasks cannot outlive the group, a thrown error cancels the siblings, and you can bound concurrency so you do not open hundreds of connections at once. Child task closures are `@Sendable`, so copy main-actor properties into local constants before the group.

**Incorrect (unstructured tasks, no limit, main-actor state read from child tasks):**

```swift
@MainActor
final class UsersModel {
    let api: UsersAPI
    var users: [User.ID: User] = [:]

    init(api: UsersAPI) { self.api = api }

    func load(ids: [User.ID]) {
        for id in ids {
            Task.detached {
                let user = try await self.api.user(id: id) // isolated property read off the main actor
                await MainActor.run { self.users[id] = user }
            }
        }
    }
}
```

**Correct (structured group with a concurrency limit):**

```swift
func fetchUsers(
    ids: [User.ID],
    api: some UsersAPI,
    maxConcurrent: Int = 4
) async throws -> [User.ID: User] {
    try await withThrowingTaskGroup(of: (User.ID, User).self) { group in
        var result: [User.ID: User] = [:]
        var iterator = ids.makeIterator()

        // Seed the group up to the limit.
        for _ in 0..<maxConcurrent {
            guard let id = iterator.next() else { break }
            group.addTask { (id, try await api.user(id: id)) }
        }
        // Each time one finishes, start the next.
        while let finished = try await group.next() {
            let (id, user) = finished
            result[id] = user
            if let nextID = iterator.next() {
                group.addTask { (nextID, try await api.user(id: nextID)) }
            }
        }
        return result
    }
}

protocol UsersAPI: Sendable {
    func user(id: User.ID) async throws -> User
}
```

Call it from the main actor with `users = try await fetchUsers(ids: ids, api: api)`. The `api` value is passed in as a `Sendable` parameter, so child tasks never touch main-actor state.

Reference: [Swift Concurrency: Task Groups](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Task-Groups)
