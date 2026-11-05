---
title: Inject Dependencies Through Protocols and a Composition Root
impact: HIGH
impactDescription: testable features, previews without network
tags: architecture, dependency-injection, protocols, environment
---

## Inject Dependencies Through Protocols and a Composition Root

**Impact: HIGH (testable features, previews without network)**

Features depend on protocols, never on concrete clients. One place, the composition root in the `App` struct, builds the live implementations and hands them down. Pass dependencies through initializers; use the SwiftUI environment for app-wide services. Mark the dependency container `nonisolated` and `Sendable` so it can be an environment default value regardless of the module's default isolation.

**Incorrect (feature constructs its own concrete dependencies):**

```swift
import SwiftUI

@MainActor
@Observable
final class UserListModel {
    private let repository = RemoteUserRepository(
        client: HTTPClient(baseURL: URL(string: "https://api.example.com")!)
    ) // untestable, no previews without network, URL hard-coded in a feature

    var users: [User] = []
}
```

**Correct (protocol dependency, container in the environment, live wiring at the root):**

```swift
import SwiftUI

protocol UserRepository: Sendable {
    func allUsers() async throws -> [User]
    func user(id: User.ID) async throws -> User
}

nonisolated struct AppDependencies: Sendable {
    var userRepository: any UserRepository

    static let preview = AppDependencies(userRepository: InMemoryUserRepository(users: User.samples))

    @MainActor // the composition root runs on the main actor
    static func live(config: AppConfig) -> AppDependencies {
        let client = HTTPClient(baseURL: config.apiBaseURL)
        return AppDependencies(userRepository: RemoteUserRepository(client: client))
    }
}

extension EnvironmentValues {
    @Entry var dependencies: AppDependencies = .preview
}

@main
struct ShopApp: App {
    private let dependencies = AppDependencies.live(config: .current)

    var body: some Scene {
        WindowGroup {
            UsersScreen()
                .environment(\.dependencies, dependencies)
        }
    }
}

struct UsersScreen: View {
    @Environment(\.dependencies) private var dependencies

    var body: some View {
        UserListView(repository: dependencies.userRepository)
    }
}

struct UserListView: View {
    @State private var model: UserListModel

    init(repository: any UserRepository) {
        // @State keeps the first instance; keep model init cheap (no work in init).
        _model = State(initialValue: UserListModel(repository: repository))
    }

    var body: some View {
        List(model.users) { Text($0.name) }
            .task { await model.load() }
    }
}

#Preview {
    UserListView(repository: InMemoryUserRepository(users: User.samples))
}
```

For larger apps, Point-Free's `swift-dependencies` package offers the same idea with less boilerplate.

Reference: [EnvironmentValues](https://developer.apple.com/documentation/swiftui/environmentvalues)
