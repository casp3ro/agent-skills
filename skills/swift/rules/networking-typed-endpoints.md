---
title: Describe Endpoints as Typed Values
impact: HIGH
impactDescription: response types checked at compile time
tags: networking, endpoints, generics, api-client
---

## Describe Endpoints as Typed Values

**Impact: HIGH (response types checked at compile time)**

Represent each API call as a value that carries its HTTP method, path, query, body, and response type: `Endpoint<Response>`. Group endpoints per resource in a caseless enum. The client then has one generic `send(_:)` method, call sites cannot decode the wrong type, and the endpoint list doubles as a typed API spec.

**Incorrect (stringly typed requests; response type chosen by each caller):**

```swift
import Foundation

func get(_ path: String) async throws -> Data {
    let url = URL(string: "https://api.example.com" + path)!
    return try await URLSession.shared.data(from: url).0
}

let data = try await get("/v1/users/\(id)")
let user = try JSONDecoder().decode(Order.self, from: data) // wrong type, fails at runtime
```

**Correct (endpoint values with a response type):**

```swift
import Foundation

public enum HTTPMethod: String, Sendable {
    case get = "GET", post = "POST", put = "PUT", patch = "PATCH", delete = "DELETE"
}

public struct Endpoint<Response: Decodable & Sendable>: Sendable {
    public var method: HTTPMethod
    public var path: String
    public var query: [URLQueryItem]
    public var body: (any Encodable & Sendable)?
    public var requiresAuth: Bool

    public init(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: (any Encodable & Sendable)? = nil,
        requiresAuth: Bool = true
    ) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
        self.requiresAuth = requiresAuth
    }
}

/// Use for endpoints that return no body (204 No Content).
public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}

enum UsersEndpoints {
    static func list(cursor: String?) -> Endpoint<Page<UserDTO>> {
        Endpoint(.get, "/v1/users", query: cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
    }

    static func user(id: User.ID) -> Endpoint<UserDTO> {
        Endpoint(.get, "/v1/users/\(id.rawValue.uuidString)")
    }

    static func update(id: User.ID, _ body: UpdateUserRequest) -> Endpoint<UserDTO> {
        Endpoint(.patch, "/v1/users/\(id.rawValue.uuidString)", body: body)
    }

    static func delete(id: User.ID) -> Endpoint<EmptyResponse> {
        Endpoint(.delete, "/v1/users/\(id.rawValue.uuidString)")
    }
}

struct Page<Item: Decodable & Sendable>: Decodable, Sendable {
    let items: [Item]
    let nextCursor: String?
}
```

Usage: `let dto = try await client.send(UsersEndpoints.user(id: id))`, where `dto` is statically `UserDTO`.

Reference: [URLSession](https://developer.apple.com/documentation/foundation/urlsession)
