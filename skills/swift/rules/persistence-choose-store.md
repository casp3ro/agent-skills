---
title: Choose the Right Store for Each Kind of Data
impact: HIGH
impactDescription: secrets protected, data in the right place
tags: persistence, userdefaults, keychain, swiftdata, grdb
---

## Choose the Right Store for Each Kind of Data

**Impact: HIGH (secrets protected, data in the right place)**

| Data | Store |
|---|---|
| Small preferences and flags | `UserDefaults` / `@AppStorage` |
| Secrets (tokens, passwords, keys) | Keychain |
| Files, caches, exports | `FileManager` (Application Support, Caches) |
| Relational app data, SwiftUI integration, iCloud sync | SwiftData |
| Full SQL control, complex queries, explicit migrations | GRDB (SQLite) |
| Your backend's database (PostgreSQL, etc.) | Never from the app: go through your API |

`UserDefaults` is an unencrypted plist readable from device backups. A mobile or desktop app must never hold database credentials for your backend: anything in the bundle can be extracted. The local database is a cache or offline store; the server stays the source of truth.

**Incorrect (secret in UserDefaults, backend database credentials shipped in the app):**

```swift
import Foundation

UserDefaults.standard.set(accessToken, forKey: "accessToken")

let databaseURL = "postgres://admin:s3cret@db.example.com:5432/prod" // extractable from the binary
```

**Correct (flags in UserDefaults, secrets in the Keychain, server data via the API):**

```swift
import SwiftUI

struct OnboardingGate: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        if hasSeenOnboarding { HomeView() } else { OnboardingView { hasSeenOnboarding = true } }
    }
}

func storeSession(token: String, keychain: Keychain) throws {
    try keychain.set(Data(token.utf8), for: "accessToken") // see persistence-keychain-secrets
}

func loadOrders(client: HTTPClient) async throws -> [OrderDTO] {
    try await client.send(OrdersEndpoints.list()) // the server owns the database
}
```

Reference: [SwiftData](https://developer.apple.com/documentation/swiftdata), [Keychain services](https://developer.apple.com/documentation/security/keychain-services)
