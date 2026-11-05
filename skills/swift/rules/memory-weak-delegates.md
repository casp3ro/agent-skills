---
title: Declare Delegates as weak
impact: MEDIUM
impactDescription: parent and child no longer keep each other alive
tags: memory, delegate, weak, anyobject
---

## Declare Delegates as weak

**Impact: MEDIUM (parent and child no longer keep each other alive)**

A delegate usually owns the object it is the delegate of (a controller owns a scanner and is its delegate). A strong `delegate` property closes the loop. Constrain delegate protocols to `AnyObject` and store the reference as `weak var`.

**Incorrect (strong delegate creates a cycle):**

```swift
protocol BarcodeScannerDelegate {
    func scanner(_ scanner: BarcodeScanner, didRead code: String)
}

final class BarcodeScanner {
    var delegate: BarcodeScannerDelegate? // strong
}
```

**Correct (class-bound protocol, weak reference):**

```swift
@MainActor
protocol BarcodeScannerDelegate: AnyObject {
    func scanner(_ scanner: BarcodeScanner, didRead code: String)
}

@MainActor
final class BarcodeScanner {
    weak var delegate: (any BarcodeScannerDelegate)?

    func simulateRead(_ code: String) {
        delegate?.scanner(self, didRead: code)
    }
}
```

In new APIs prefer `AsyncStream` or async functions over delegates; keep delegates for UIKit/AppKit integration.

Reference: [Unowned and Weak References](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/#Resolving-Strong-Reference-Cycles-Between-Class-Instances)
