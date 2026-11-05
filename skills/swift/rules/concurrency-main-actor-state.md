---
title: Keep UI State on the Main Actor
impact: CRITICAL
impactDescription: prevents UI races and threading crashes
tags: concurrency, mainactor, swiftui, observable
---

## Keep UI State on the Main Actor

**Impact: CRITICAL (prevents UI races and threading crashes)**

UI frameworks may only be touched from the main thread. Anything that drives UI (view models, routers, `@Observable` app state) must be isolated to `@MainActor`. With default main-actor isolation this is inferred, but types shared across modules should state it explicitly. Do not hop to the main thread manually with GCD.

**Incorrect (mutable UI state with no isolation, updated from a GCD callback):**

```swift
import Foundation
import Observation

@Observable
final class ProfileModel {
    var name = ""

    func load(service: ProfileService) {
        service.fetchName { name in
            DispatchQueue.main.async {
                self.name = name // captures non-Sendable self across threads
            }
        }
    }
}
```

**Correct (main-actor isolated model, async API, no manual thread hopping):**

```swift
import Observation

@MainActor
@Observable
final class ProfileModel {
    private(set) var name = ""
    private let service: any ProfileService

    init(service: any ProfileService) {
        self.service = service
    }

    func load() async {
        do {
            name = try await service.fetchName() // resumes on the main actor
        } catch {
            name = ""
        }
    }
}

protocol ProfileService: Sendable {
    func fetchName() async throws -> String
}
```

After every `await`, code in a `@MainActor` function resumes on the main actor, so assigning to UI state is always safe. `DispatchQueue.main.async` and `MainActor.run` are almost never needed in new code.

Reference: [Swift Concurrency: Actors](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Actors)
