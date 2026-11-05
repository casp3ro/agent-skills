---
title: Offload CPU-Heavy Work with @concurrent
impact: CRITICAL
impactDescription: removes main-thread hangs without unsafe escapes
tags: concurrency, concurrent, performance, background
---

## Offload CPU-Heavy Work with @concurrent

**Impact: CRITICAL (removes main-thread hangs without unsafe escapes)**

With Approachable Concurrency, `async` alone does not mean "background". To run CPU-bound work (decoding, image processing, parsing large files, crypto) off the main actor, mark a nonisolated `async` function `@concurrent`. Inputs and outputs must be `Sendable`. Do not reach for `Task.detached` or `DispatchQueue.global()`: they drop priority and cancellation and bypass isolation checking.

Do not mark network or disk calls `@concurrent`. Waiting on I/O does not block a thread; `URLSession` already suspends.

**Incorrect (heavy work on the main actor, or escaping isolation with GCD):**

```swift
import Foundation

@MainActor
final class ReportModel {
    var summary = ""

    func process(_ csv: Data) {
        summary = CSVParser.summarize(csv) // blocks UI for seconds on large files
    }

    func processLegacy(_ csv: Data) {
        DispatchQueue.global().async {
            let result = CSVParser.summarize(csv)
            DispatchQueue.main.async { self.summary = result }
        }
    }
}
```

**Correct (explicit background function, awaited from the main actor):**

```swift
import Foundation

nonisolated struct ReportProcessor {
    @concurrent
    func summarize(_ csv: Data) async -> String {
        CSVParser.summarize(csv) // runs on the global concurrent executor
    }
}

@MainActor
final class ReportModel {
    var summary = ""
    private let processor = ReportProcessor()

    func process(_ csv: Data) async {
        summary = await processor.summarize(csv) // back on the main actor here
    }
}
```

Everything a `@concurrent` function calls synchronously must be nonisolated too. In a module with main-actor default isolation, mark helper types `nonisolated` (as `ReportProcessor` is here), or move CPU-bound code into a module that keeps the default `nonisolated` isolation.

Only add `@concurrent` after measuring a hang (Instruments → Hangs, Time Profiler, Swift Concurrency). Most async functions should stay on the caller's actor.

Reference: [Swift 6.2 Released: Approachable Concurrency](https://www.swift.org/blog/swift-6.2-released/)
