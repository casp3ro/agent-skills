---
title: Refresh Tokens Once and Retry 401s Once
impact: HIGH
impactDescription: no refresh storms, no infinite retry loops
tags: networking, auth, tokens, actor, retry
---

## Refresh Tokens Once and Retry 401s Once

**Impact: HIGH (no refresh storms, no infinite retry loops)**

When the access token expires, many concurrent requests get `401` at the same time. Each one refreshing on its own floods the auth server and races on the stored token. Keep the token in an actor that deduplicates in-flight refreshes (see `concurrency-actor-reentrancy`), invalidate it on `401`, and retry the request exactly once. Store refresh tokens in the Keychain, never in `UserDefaults`.

**Incorrect (every 401 triggers its own refresh; retries forever):**

```swift
func send<R>(_ endpoint: Endpoint<R>) async throws -> R {
    do {
        return try await perform(endpoint)
    } catch NetworkError.unauthorized {
        token = try await authAPI.refresh() // N concurrent refreshes, racing writes
        return try await send(endpoint)     // loops forever if refresh keeps failing
    }
}
```

**Correct (actor-backed provider; the client retries once):**

```swift
public actor AuthTokenStore: AccessTokenProvider {
    private var token: String?
    private var refreshTask: Task<String, any Error>?
    private let refresh: @Sendable () async throws -> String

    public init(refresh: @escaping @Sendable () async throws -> String) {
        self.refresh = refresh
    }

    public func validToken() async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let refresh = self.refresh
        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    public func invalidateToken() {
        token = nil
    }
}

// Composition root:
// let tokens = AuthTokenStore(refresh: { try await authAPI.refreshAccessToken(using: keychain) })
// let client = HTTPClient(baseURL: config.apiBaseURL, tokens: tokens)
```

`HTTPClient.perform` (see `networking-single-client`) handles `401` by calling `invalidateToken()` and retrying with `allowAuthRetry: false`; a second `401` surfaces as `NetworkError.unauthorized`, which the app handles by signing out.

Reference: [SE-0306 Actors](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md)
