---
title: Expose the Minimal Public API per Module
impact: MEDIUM
impactDescription: encapsulation enforced by the compiler
tags: modules, access-control, public, package
---

## Expose the Minimal Public API per Module

**Impact: MEDIUM (encapsulation enforced by the compiler)**

Access levels: `private` (enclosing declaration), `fileprivate` (file), `internal` (module, the default), `package` (all modules in the same Swift package), `public` (other modules can use it), `open` (other modules can also subclass or override). Keep implementation details `internal`, use `package` for helpers shared across your own modules, and mark only the real entry points `public`.

**Incorrect (everything public "so it compiles"):**

```swift
public final class HTTPClient {
    public var baseURL: URL
    public var decoder = JSONDecoder()
    public func makeRequest(path: String) -> URLRequest { /* ... */ fatalError() }
    public func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R { fatalError() }
}
```

**Correct (only the contract is public):**

```swift
import Foundation

public final class HTTPClient: Sendable {
    private let baseURL: URL
    private let decoder = JSONDecoder()

    public init(baseURL: URL) {
        self.baseURL = baseURL
    }

    public func send<R: Decodable & Sendable>(_ endpoint: Endpoint<R>) async throws -> R {
        let request = try makeRequest(for: endpoint)
        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode(R.self, from: data)
    }

    // Shared with other modules in this package (e.g. test support), hidden from the app.
    package func makeRequest<R>(for endpoint: Endpoint<R>) throws -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: endpoint.path))
        request.httpMethod = endpoint.method.rawValue
        return request
    }
}
```

Public structs do not get a public memberwise initializer; write `public init` explicitly. Public types must state `Sendable` explicitly because it is not inferred across module boundaries.

Reference: [Access Control](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/)
