---
title: Test Through Protocol Fakes, Not the Network
impact: MEDIUM
impactDescription: fast, deterministic tests
tags: testing, fakes, stubs, transport, swiftdata
---

## Test Through Protocol Fakes, Not the Network

**Impact: MEDIUM (fast, deterministic tests)**

Tests that hit real servers are slow, flaky, and depend on data you do not control. Because the HTTP client takes an `HTTPTransport` and features take repository protocols, tests substitute fakes: a stub transport to test request building, decoding, and error mapping; in-memory repositories to test feature models; an in-memory `ModelContainer` to test SwiftData code.

**Incorrect (unit test calls the staging API):**

```swift
import Testing
@testable import Networking

@Test func decodesUser() async throws {
    let client = HTTPClient(baseURL: URL(string: "https://staging.example.com")!)
    let user = try await client.send(UsersEndpoints.user(id: User.ID(UUID()))) // network, flaky, random ID
    #expect(!user.fullName.isEmpty)
}
```

**Correct (stub transport and in-memory store):**

```swift
import Foundation
import SwiftData
import Testing
@testable import Networking
@testable import Persistence

struct StubTransport: HTTPTransport {
    enum Outcome: Sendable {
        case response(statusCode: Int, body: String)
        case failure(URLError)
    }

    let outcome: Outcome

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        switch outcome {
        case .response(let statusCode, let body):
            // Force-unwraps are acceptable in test helpers with constant inputs.
            let response = HTTPURLResponse(url: request.url!, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
            return (Data(body.utf8), response)
        case .failure(let error):
            throw error
        }
    }
}

@Test func decodesSnakeCaseUser() async throws {
    let json = """
    {"id": "6F9619FF-8B86-D011-B42D-00C04FC964FF", "full_name": "Ada Lovelace",
     "email": "ada@example.com", "role": "admin", "created_at": "2026-01-01T00:00:00Z"}
    """
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .response(statusCode: 200, body: json))
    )

    let dto = try await client.send(UsersEndpoints.user(id: User.ID(UUID())))

    #expect(dto.fullName == "Ada Lovelace")
}

@Test func mapsOfflineError() async {
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .failure(URLError(.notConnectedToInternet)))
    )

    await #expect(throws: NetworkError.offline) {
        try await client.send(UsersEndpoints.user(id: User.ID(UUID())))
    }
}

@Test func upsertUpdatesExistingProject() async throws {
    let container = try ModelContainer(
        for: Project.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: true)
    )
    let store = ProjectSyncStore(modelContainer: container)
    let id = UUID()

    try await store.upsert([ProjectDTO(id: id, name: "Old", createdAt: .now)])
    try await store.upsert([ProjectDTO(id: id, name: "New", createdAt: .now)])

    let projects = try ModelContext(container).fetch(FetchDescriptor<Project>())
    #expect(projects.map(\.name) == ["New"])
}
```

Reference: [Swift Testing: Expectations and confirmations](https://developer.apple.com/documentation/testing/expectations)
