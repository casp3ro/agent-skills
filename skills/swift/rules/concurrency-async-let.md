---
title: Use async let for Independent Calls
impact: CRITICAL
impactDescription: N round trips become 1
tags: concurrency, async-let, parallel, waterfalls
---

## Use async let for Independent Calls

**Impact: CRITICAL (N round trips become 1)**

Sequential `await`s on independent operations form a waterfall: each one waits for the previous to finish. `async let` starts child tasks immediately and runs them in parallel. It is the structured equivalent of `Promise.all`: if one throws, the others are cancelled automatically, and the function cannot return until all children finish.

**Incorrect (three sequential round trips):**

```swift
func loadDashboard(api: some DashboardAPI) async throws -> Dashboard {
    let profile = try await api.profile()
    let stats = try await api.stats()
    let alerts = try await api.alerts()
    return Dashboard(profile: profile, stats: stats, alerts: alerts)
}
```

**Correct (three parallel child tasks):**

```swift
func loadDashboard(api: some DashboardAPI) async throws -> Dashboard {
    async let profile = api.profile()
    async let stats = api.stats()
    async let alerts = api.alerts()
    return try await Dashboard(profile: profile, stats: stats, alerts: alerts)
}

protocol DashboardAPI: Sendable {
    func profile() async throws -> Profile
    func stats() async throws -> Stats
    func alerts() async throws -> [Alert]
}
```

Use `async let` for a fixed, small number of calls. For a dynamic number, use a task group. Values captured by `async let` initializers must be `Sendable`, so pass dependencies as parameters or local constants rather than reading main-actor properties inside the initializer.

Reference: [Swift Concurrency: Calling Asynchronous Functions in Parallel](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Calling-Asynchronous-Functions-in-Parallel)
