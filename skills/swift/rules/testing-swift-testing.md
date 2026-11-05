---
title: Write Tests with Swift Testing
impact: MEDIUM
impactDescription: expressive, parallel, parameterized tests
tags: testing, swift-testing, expect, parameterized
---

## Write Tests with Swift Testing

**Impact: MEDIUM (expressive, parallel, parameterized tests)**

Swift Testing (`import Testing`) is the default for new tests: `@Test` functions, `#expect` with rich failure output, `try #require` to unwrap or stop, `arguments:` for parameterized cases, and `@Suite` for grouping. Tests run in parallel by default, which surfaces hidden shared state. Keep XCTest for UI tests (XCUITest) and performance tests; the two frameworks interoperate, so migrate incrementally.

**Incorrect (XCTest boilerplate, one test per input, opaque failures):**

```swift
import XCTest
@testable import FeatureUsers

final class UserListModelTests: XCTestCase {
    func testSearchLowercase() async {
        let model = await UserListModel(repository: InMemoryUserRepository(users: .samples))
        await model.load()
        await MainActor.run { model.searchQuery = "ada" }
        let count = await model.filteredUsers.count
        XCTAssertTrue(count == 1) // failure message: "XCTAssertTrue failed"
    }
    // testSearchUppercase, testSearchPrefix: copies of the above
}
```

**Correct (Swift Testing, main-actor suite, parameterized, clear failures):**

```swift
import Testing
@testable import FeatureUsers

@Suite("UserListModel")
@MainActor
struct UserListModelTests {
    @Test func loadsUsers() async throws {
        let model = UserListModel(repository: InMemoryUserRepository(users: [.sample(name: "Ada")]))

        await model.load()

        guard case .loaded(let users) = model.state else {
            Issue.record("Expected loaded state, got \(model.state)")
            return
        }
        #expect(users.map(\.name) == ["Ada"])
    }

    @Test("Search is case-insensitive", arguments: ["ada", "ADA", "Ad"])
    func search(query: String) async {
        let model = UserListModel(repository: InMemoryUserRepository(users: [.sample(name: "Ada"), .sample(name: "Bob")]))
        await model.load()

        model.searchQuery = query

        #expect(model.filteredUsers.map(\.name) == ["Ada"])
    }

    @Test func surfacesFailures() async {
        let model = UserListModel(repository: FailingUserRepository(error: NetworkError.offline))
        await model.load()

        guard case .failed(let error) = model.state else {
            Issue.record("Expected failed state")
            return
        }
        #expect(error as? NetworkError == .offline)
    }
}
```

Reference: [Swift Testing](https://developer.apple.com/documentation/testing)
