---
title: Follow Swift Naming Conventions
impact: MEDIUM
impactDescription: code looks native to every Swift reader
tags: api, naming, mutating, bool, protocols
---

## Follow Swift Naming Conventions

**Impact: MEDIUM (code looks native to every Swift reader)**

- Types and protocols use `UpperCamelCase`; everything else `lowerCamelCase`. Acronyms are uniform case: `userID`, `urlSession`, `HTTPClient`, `JSONDecoder`.
- Mutating methods are imperative verbs; their non-mutating counterparts use `-ed`/`-ing`: `sort()`/`sorted()`, `append(_:)`/`appending(_:)`.
- Booleans read as assertions: `isEmpty`, `hasPrefix(_:)`, `canSend`, `shouldRetry`.
- Protocols that describe what something is are nouns (`Collection`); capabilities end in `-able`, `-ible`, or `-ing` (`Sendable`, `Codable`, `ProgressReporting`).
- Factory methods begin with `make`: `makeIterator()`, `makeRequest()`.
- Enum cases are `lowerCamelCase`: `case notFound`, not `case NotFound` or `NOT_FOUND`.

**Incorrect (mixed conventions):**

```swift
protocol UserRepositoryProtocol {}
enum Status { case NOT_FOUND, Success }

struct Cart {
    var items: [Item] = []
    var empty: Bool { items.isEmpty }
    func getSortedItems() -> [Item] { items.sorted { $0.name < $1.name } }
    mutating func sortedInPlace() { items.sort { $0.name < $1.name } }
    func createRequest() -> URLRequest? { nil }
    var userId: String = ""
}
```

**Correct (Swift conventions):**

```swift
import Foundation

protocol UserRepository {}
enum Status { case notFound, success }

struct Cart {
    var items: [Item] = []
    var userID = ""
    var isEmpty: Bool { items.isEmpty }

    mutating func sort() { items.sort { $0.name < $1.name } }
    func sorted() -> Cart {
        var copy = self
        copy.sort()
        return copy
    }

    func makeRequest() -> URLRequest? { nil }
}
```

Reference: [Swift API Design Guidelines: Naming](https://www.swift.org/documentation/api-design-guidelines/#naming)
