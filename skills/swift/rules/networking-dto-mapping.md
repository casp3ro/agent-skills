---
title: Decode DTOs and Map Them to Domain Models at the Boundary
impact: MEDIUM-HIGH
impactDescription: API changes stay out of features
tags: networking, codable, dto, mapping, domain
---

## Decode DTOs and Map Them to Domain Models at the Boundary

**Impact: MEDIUM-HIGH (API changes stay out of features)**

Decode JSON into DTO structs that mirror the wire format, then map them to domain models in the data layer. `Codable` validates the shape like a schema library (zod) would: a missing key or wrong type throws a precise `DecodingError`. Mapping is where you convert raw strings into enums, rename fields, and reject invalid data, so backend quirks never reach views.

**Incorrect (views consume the wire format directly):**

```swift
import SwiftUI

struct UserDTO: Decodable {
    let id: String
    let full_name: String
    let role: String // "admin" | "member" | ... unchecked
}

struct UserRow: View {
    let user: UserDTO
    var body: some View {
        Text(user.full_name)
            .foregroundStyle(user.role == "admin" ? .red : .primary) // string comparison in UI
    }
}
```

**Correct (DTO for decoding, domain model for the app, explicit mapping):**

```swift
import Foundation

struct UserDTO: Decodable, Sendable {
    let id: UUID
    let fullName: String   // decoded from "full_name" via .convertFromSnakeCase
    let email: String
    let role: String
    let createdAt: Date
}

enum Role: String, Sendable, Codable {
    case admin, member, guest
}

struct User: Identifiable, Hashable, Sendable {
    typealias ID = Tagged<User, UUID>
    let id: ID
    var name: String
    var email: String
    var role: Role
}

enum MappingError: Error, Equatable {
    case unknownRole(String)
}

extension User {
    init(dto: UserDTO) throws {
        guard let role = Role(rawValue: dto.role) else { throw MappingError.unknownRole(dto.role) }
        self.init(id: ID(dto.id), name: dto.fullName, email: dto.email, role: role)
    }
}

struct RemoteUserRepository: UserRepository {
    let client: HTTPClient

    func allUsers() async throws -> [User] {
        let page = try await client.send(UsersEndpoints.list(cursor: nil))
        return try page.items.map(User.init(dto:))
    }

    func user(id: User.ID) async throws -> User {
        try User(dto: await client.send(UsersEndpoints.user(id: id)))
    }
}
```

When a key cannot be derived by snake-case conversion, declare `enum CodingKeys: String, CodingKey` on the DTO. Never put `CodingKeys` or wire-format names on domain models.

Reference: [Encoding and Decoding Custom Types](https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types)
