---
title: Design Call Sites That Read Like Prose
impact: MEDIUM
impactDescription: self-documenting APIs
tags: api, naming, argument-labels, functions
---

## Design Call Sites That Read Like Prose

**Impact: MEDIUM (self-documenting APIs)**

Every parameter has an argument label (used at the call site) and a parameter name (used in the body). Clarity at the point of use matters more than brevity of the declaration. Omit the first label with `_` when the argument is the obvious direct object (`print(x)`, `contains(x)`); use prepositional labels when they form a phrase (`move(from:to:)`, `remove(at:)`); name parameters by role, not type; and give defaults to rarely changed parameters.

**Incorrect (TypeScript-style naming; call site needs comments):**

```swift
func fetchUserData(userIdString: String, shouldIncludeOrdersFlag: Bool, timeoutSecondsValue: Double) async throws -> User {
    fatalError()
}

func addObserver(observer: Observer) {}

let user = try await fetchUserData(userIdString: id, shouldIncludeOrdersFlag: false, timeoutSecondsValue: 30)
```

**Correct (labels form a sentence; defaults hide the uncommon):**

```swift
func user(id: User.ID, includingOrders: Bool = false, timeout: Duration = .seconds(30)) async throws -> User {
    fatalError()
}

func add(_ observer: Observer) {}

func move(from source: IndexSet, to destination: Int) {}

let user = try await user(id: id)
let detailed = try await user(id: id, includingOrders: true)
```

When the parameter type is weak (`Any`, `String`, `Int`), add a noun to the label to restore meaning: `addObserver(_ observer: NSObject, forKeyPath path: String)`.

Reference: [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
