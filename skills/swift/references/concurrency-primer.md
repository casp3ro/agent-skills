# Swift Concurrency Primer (for Developers from Single-Threaded JavaScript)

This primer assumes no prior knowledge of threads. It explains why native apps need a different mental model than Node.js or the browser, and how Swift 6.2+ makes that model approachable. The `concurrency-*` rules contain the concrete do/don't patterns.

---

## 1. The JavaScript Baseline

In Node.js and the browser, your JavaScript runs on **one thread** with an **event loop**. `await fetch()` does not block that thread: it hands control back to the loop, I/O happens elsewhere (libuv, the browser), and when the response arrives the continuation is queued and runs once the thread is free. As a result, **two lines of your JavaScript never execute at the same moment**. There are no data races on variables, only logical race conditions (responses arriving in an unexpected order).

The cost: CPU-heavy work (parsing a 200 MB JSON file) blocks everything. The JavaScript escape hatch is Worker threads: isolated environments that communicate by copying messages (`postMessage`).

## 2. What Is Different on a Native Platform

Devices have many CPU cores. The operating system runs **many threads truly in parallel**.

- **The main thread** is the only thread allowed to touch UI. It renders 60–120 frames per second. Block it for more than about 100 ms and the user sees a hang; block it for long during launch and the system may terminate the app.
- **Background threads** do heavy work: image decoding, parsing, compression, cryptography.

The new danger is the **data race**: two threads read and write the same memory at the same time. The result is undefined behavior: corrupted data, random crashes that never reproduce locally.

```swift
// Conceptual: two threads run `counter += 1` simultaneously.
// Thread A reads 0, thread B reads 0, both write 1. Expected 2, got 1 (or worse).
// The Swift 6 compiler refuses to compile code that allows this.
```

Historically (Objective-C, early Swift) developers prevented races by hand with locks and GCD queues (`DispatchQueue`), which is easy to get wrong. **Swift Concurrency solves this in the language**: in Swift 6 language mode the compiler **rejects code that could race**. That is its superpower and, at first, its main source of frustration. A `Sendable` or isolation error is not an obstacle: it is a bug found for you at compile time.

## 3. Vocabulary

| Term | Meaning | Closest JavaScript idea |
|---|---|---|
| `async` function | Can suspend at `await` points | `async function` |
| `await` | A suspension point; the thread is freed for other work | `await` |
| `Task` | A unit of asynchronous work | A started `Promise` |
| Executor | Where a task physically runs (main thread, global pool) | The event loop |
| **Isolation** | Who owns a piece of state, and from which domain it may be touched | None: everything is one thread |
| `@MainActor` | The main-thread isolation domain (UI) | The single JS thread |
| `actor` | Its own isolation domain that serializes access to its state | A Worker with a message queue |
| `Sendable` | A type that may safely cross between isolation domains | Data you can `postMessage` |
| Structured concurrency | Child tasks live within their parent's scope; cancellation propagates down | No native equivalent (manual `AbortController`) |

## 4. The 2026 Default: Approachable Concurrency

Since Swift 6.2 (Xcode 26), new **app** projects enable two settings (Build Settings → Swift Compiler – Concurrency):

1. **Default Actor Isolation = MainActor** (SE-0466). All unannotated code in the module is treated as `@MainActor`. In other words, **your app is single-threaded by default, like JavaScript.** You write ordinary code without thinking about threads.
2. **Approachable Concurrency**, which includes SE-0461 (`nonisolated(nonsending)` by default): a nonisolated `async` function **runs on the caller's actor**, instead of hopping to a background thread. In Swift 6.0/6.1 such functions jumped to the global pool automatically, which produced most of the confusing `Sendable` errors.
3. When you **do** want background execution, you say so explicitly with **`@concurrent`**.

Concurrency is therefore **opt-in, not opt-out**: start single-threaded and introduce parallelism where you can name the reason.

> **Swift packages are different.** SPM targets default to `nonisolated` isolation and do not enable the approachable-concurrency features automatically. Configure them in `Package.swift` (rule `concurrency-swift6-mode`).
>
> **Older material.** Many tutorials from before 2025 use `await MainActor.run { }` and `DispatchQueue.main.async { }`. With the settings above you almost never need them in new code.

## 5. async/await

```swift
import Foundation

struct User: Decodable, Sendable { let name: String }

func fetchUser(from url: URL) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

`await` does **not** block the thread. It suspends this function, and the thread does other work (such as rendering UI) in the meantime, exactly as in JavaScript. One difference: a nonisolated function may resume on a different thread after `await`. Code isolated to an actor (including `@MainActor`) always resumes on that actor.

## 6. Starting Work

You cannot `await` from synchronous code (for example a button action), so you start a task:

```swift
import SwiftUI

struct RefreshButton: View {
    let refresh: () async -> Void

    var body: some View {
        Button("Refresh") {
            Task { await refresh() } // inherits the current actor (MainActor here)
        }
    }
}
```

In SwiftUI prefer the `.task` modifier, which starts when the view appears and is **cancelled automatically** when it disappears; `.task(id:)` restarts when the id changes (rule `concurrency-structured-tasks`). Avoid `Task.detached`: it drops actor inheritance, priority, and task-local values. For background work, call a `@concurrent` function instead.

## 7. Background Work with @concurrent

```swift
import Foundation

nonisolated struct ThumbnailRenderer {
    @concurrent
    func render(_ imageData: Data) async throws -> Data {
        // CPU-heavy work on the global concurrent pool, off the main thread
        imageData // placeholder for decode + resize + encode
    }
}
```

Use it for decoding, compression, parsing large files, and data processing **when Instruments shows the main thread is busy**. Do not use it for network calls: waiting on I/O is not CPU work, and `URLSession` already suspends without blocking.

## 8. Parallelism

| JavaScript | Swift |
|---|---|
| `await Promise.all([a(), b()])` | `async let x = a(); async let y = b(); try await (x, y)` |
| `Promise.all(items.map(f))` | `withThrowingTaskGroup` (rule `concurrency-task-group`) |
| `Promise.race` | Task group + `group.next()` + `group.cancelAll()` |
| `AbortController` | `task.cancel()` + `Task.checkCancellation()` |
| `setTimeout(fn, 1000)` | `try await Task.sleep(for: .seconds(1))` |
| Async iterator, `for await` | `AsyncSequence`, `for try await` |
| EventEmitter → stream | `AsyncStream` |

**Structured concurrency** means child tasks from `async let` and task groups cannot escape the function. If one throws, the others are cancelled automatically, and the function does not return until all of them finish. With `Promise.all`, a rejection returns early but the other fetches keep running; Swift does not have that problem.

## 9. Actors

An `actor` is a reference type whose mutable state is protected from concurrent access. Only one task at a time executes the actor's code, so you need no locks, and every access from outside requires `await` because the caller may have to wait its turn.

The trap is **reentrancy**: at each `await` inside an actor, other tasks can run and change its state. Never assume state is unchanged after an `await` (rule `concurrency-actor-reentrancy`).

Use actors for state shared across domains (caches, sessions, token stores, connection registries). UI state belongs on `@MainActor`, and stateless services should be plain `Sendable` structs.

## 10. Sendable

Values that cross isolation domains must be `Sendable`:

- Structs and enums whose stored properties are `Sendable`: automatic (state it explicitly on public types).
- `final class` with only `let` properties of `Sendable` types: declare `: Sendable`.
- Actors and `@MainActor` types: always `Sendable`.
- Closures passed across domains: `@Sendable`.

Do not silence the compiler with `@unchecked Sendable`, `nonisolated(unsafe)`, or `@preconcurrency import` unless you have real synchronization (for example `Mutex` from the `Synchronization` module) and a comment explaining it (rule `concurrency-no-unsafe-escapes`).

## 11. Cancellation

Cancellation is cooperative: `task.cancel()` only sets a flag. System APIs react to it; your loops must check `try Task.checkCancellation()`. `CancellationError` is not a failure to show the user (rule `concurrency-cancellation`).

## 12. Decision Checklist

1. Ordinary app or UI logic → do nothing special; it runs on the main actor.
2. Waiting on network or disk → `async`/`await`, no `@concurrent`.
3. Measured CPU-heavy work blocking the UI → a `@concurrent` function on a `nonisolated` type, with `Sendable` inputs and outputs.
4. Several independent operations → `async let` (fixed count) or a task group (dynamic count).
5. State shared between tasks or domains → `actor`.
6. A `Sendable` error → first ask whether the value really needs to cross the boundary; usually make it a struct. Never silence it with unsafe attributes.
7. Debugging → Instruments (Swift Concurrency, Swift Executors, Hangs) and Thread Sanitizer in tests.

## Further Reading

- [The Swift Programming Language: Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
- [Swift 6 Concurrency Migration Guide](https://www.swift.org/migration/documentation/migrationguide)
- [SE-0461: Run nonisolated async functions on the caller's actor by default](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md)
- [SE-0466: Control default actor isolation inference](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md)
- WWDC sessions: "Meet async/await in Swift" (2021), "Explore structured concurrency in Swift" (2021), "Migrate your app to Swift 6" (2024), "Embracing Swift concurrency" (2025)
