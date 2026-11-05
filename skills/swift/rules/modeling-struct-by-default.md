---
title: Model Data with Structs by Default
impact: CRITICAL
impactDescription: no shared mutation, Sendable for free
tags: modeling, struct, value-types, classes
---

## Model Data with Structs by Default

**Impact: CRITICAL (no shared mutation, Sendable for free)**

Structs are value types: assignment copies (collections use copy-on-write, so copies are cheap until mutated). Nobody else can mutate your copy, and structs of `Sendable` members are `Sendable` automatically. Classes share one instance through references, like JavaScript objects. Use a class only when you need identity, shared mutable state, inheritance, or a framework requires it (`@Observable` models, SwiftData `@Model`, UIKit).

**Incorrect (class for plain data; a mutation leaks to every holder):**

```swift
final class Address {
    var street: String
    var city: String
    init(street: String, city: String) {
        self.street = street
        self.city = city
    }
}

let shipping = Address(street: "Main St 1", city: "Kraków")
let billing = shipping
billing.city = "Warsaw" // shipping.city is now "Warsaw" too
```

**Correct (struct with synthesized conformances):**

```swift
struct Address: Hashable, Codable, Sendable {
    var street: String
    var city: String
}

let shipping = Address(street: "Main St 1", city: "Kraków")
var billing = shipping
billing.city = "Warsaw" // shipping is unchanged
```

`let` on a struct is deep immutability: no property can change. Methods that modify a struct must be `mutating`, which makes mutation visible at the declaration.

Reference: [Choosing Between Structures and Classes](https://developer.apple.com/documentation/swift/choosing-between-structures-and-classes)
