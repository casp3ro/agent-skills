---
title: Capture self Weakly in Stored Closures
impact: HIGH
impactDescription: prevents retain cycles and leaks
tags: memory, arc, closures, retain-cycle
---

## Capture self Weakly in Stored Closures

**Impact: HIGH (prevents retain cycles and leaks)**

ARC frees a class instance when its strong reference count reaches zero. If an object stores a closure that captures `self` strongly, the object and the closure keep each other alive forever. Break the cycle with `[weak self]` in closures that are stored (properties, callbacks registered with long-lived objects, observers).

**Incorrect (self → handler → self cycle):**

```swift
final class Downloader {
    var onProgress: ((Double) -> Void)?
    private(set) var progress = 0.0

    func start() {
        onProgress = { value in
            self.progress = value // strong capture; Downloader never deinitializes
        }
    }

    deinit { print("never printed") }
}
```

**Correct (weak capture breaks the cycle):**

```swift
final class Downloader {
    var onProgress: ((Double) -> Void)?
    private(set) var progress = 0.0

    func start() {
        onProgress = { [weak self] value in
            guard let self else { return }
            self.progress = value
        }
    }

    deinit { print("released") }
}
```

Use Xcode's Debug Memory Graph and Instruments → Leaks to confirm. `unowned` also breaks cycles but crashes if the object is gone; prefer `weak` unless the lifetime is guaranteed.

Reference: [Automatic Reference Counting: Strong Reference Cycles for Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/#Strong-Reference-Cycles-for-Closures)
