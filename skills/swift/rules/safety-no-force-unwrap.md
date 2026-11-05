---
title: Never Force-Unwrap Runtime Data
impact: HIGH
impactDescription: prevents production crashes
tags: safety, optionals, force-unwrap, crashes
---

## Never Force-Unwrap Runtime Data

**Impact: HIGH (prevents production crashes)**

`!`, `try!`, and `as!` crash the app when they fail. They are acceptable only where failure is a programmer error that should be caught in development: a URL built from a string literal, a resource bundled with the app. For anything that comes from the network, disk, the user, or the environment, unwrap safely and handle the failure.

**Incorrect (crashes on unexpected server data):**

```swift
import Foundation

func avatarURL(from json: [String: Any]) -> URL {
    let path = json["avatar"] as! String
    return URL(string: path)!
}

let config = try! JSONDecoder().decode(Config.self, from: data)
```

**Correct (handle absence and failure; force-unwrap only literals):**

```swift
import Foundation

func avatarURL(from json: [String: Any]) -> URL? {
    guard let path = json["avatar"] as? String else { return nil }
    return URL(string: path)
}

func loadConfig(from data: Data) throws -> Config {
    try JSONDecoder().decode(Config.self, from: data)
}

// Acceptable: a literal that is known valid at compile time.
let supportURL = URL(string: "https://example.com/support")!
```

Enforce it with SwiftLint's `force_unwrapping`, `force_try`, and `force_cast` rules in production targets.

Reference: [Optionals](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/#Optionals)
