# Swift Best Practices

**Version 1.0.0**  
casp3ro  
November 2026

> **Note:**  
> This document is mainly for agents and LLMs to follow when maintaining,  
> generating, or refactoring Swift, SwiftUI, and Swift package codebases. Humans  
> may also find it useful, but guidance here is optimized for automation  
> and consistency by AI-assisted workflows.

---

## Abstract

Production guide for modern Swift (Swift 6.2+ language mode, current through Swift 6.4) on iOS and macOS, designed for AI agents and LLMs. Contains 62 rules across 12 categories, prioritized by impact from critical (concurrency and data-race safety, data modeling with value types) to incremental (tooling and observability). Covers approachable concurrency (main-actor default isolation, @concurrent, actors, task groups, cancellation), enums and strong types, optionals and typed errors, ARC, SwiftUI architecture with @Observable and dependency injection, repository structure with local Swift packages, typed networking clients, SwiftData and Keychain persistence, webhooks, push notifications and WebSockets, Swift Testing, and configuration. Each rule explains why it matters and compares incorrect and correct Swift code. Two reference primers explain how Swift works for TypeScript developers and how concurrency works for developers coming from single-threaded JavaScript.

---

## Table of Contents

1. [Concurrency and Data-Race Safety](#1-concurrency-and-data-race-safety) — **CRITICAL**
   - 1.1 [Bridge Callback APIs with Continuations and AsyncStream](#11-bridge-callback-apis-with-continuations-and-asyncstream)
   - 1.2 [Do Not Assume Actor State Survives an Await](#12-do-not-assume-actor-state-survives-an-await)
   - 1.3 [Do Not Silence Sendable Errors with Unsafe Escapes](#13-do-not-silence-sendable-errors-with-unsafe-escapes)
   - 1.4 [Enable Swift 6 Mode and Approachable Concurrency](#14-enable-swift-6-mode-and-approachable-concurrency)
   - 1.5 [Keep UI State on the Main Actor](#15-keep-ui-state-on-the-main-actor)
   - 1.6 [Offload CPU-Heavy Work with @concurrent](#16-offload-cpu-heavy-work-with-concurrent)
   - 1.7 [Pass Value Types Across Isolation Boundaries](#17-pass-value-types-across-isolation-boundaries)
   - 1.8 [Protect Shared Mutable State with an Actor](#18-protect-shared-mutable-state-with-an-actor)
   - 1.9 [Support Cooperative Cancellation](#19-support-cooperative-cancellation)
   - 1.10 [Tie Task Lifetime to the UI with .task](#110-tie-task-lifetime-to-the-ui-with-task)
   - 1.11 [Use async let for Independent Calls](#111-use-async-let-for-independent-calls)
   - 1.12 [Use Task Groups for Dynamic Fan-Out](#112-use-task-groups-for-dynamic-fan-out)
2. [Data Modeling and Value Semantics](#2-data-modeling-and-value-semantics) — **CRITICAL**
   - 2.1 [Avoid default in Switches over Your Own Enums](#21-avoid-default-in-switches-over-your-own-enums)
   - 2.2 [Make Impossible States Unrepresentable with Enums](#22-make-impossible-states-unrepresentable-with-enums)
   - 2.3 [Mark Classes final and Prefer Composition](#23-mark-classes-final-and-prefer-composition)
   - 2.4 [Model Data with Structs by Default](#24-model-data-with-structs-by-default)
   - 2.5 [Prefer some and Generics over any](#25-prefer-some-and-generics-over-any)
   - 2.6 [Use Strongly Typed Identifiers](#26-use-strongly-typed-identifiers)
3. [Optionals and Error Handling](#3-optionals-and-error-handling) — **HIGH**
   - 3.1 [Do Not Swallow Errors with try?](#31-do-not-swallow-errors-with-try)
   - 3.2 [Never Force-Unwrap Runtime Data](#32-never-force-unwrap-runtime-data)
   - 3.3 [Throw Domain Errors and Map Them at Layer Boundaries](#33-throw-domain-errors-and-map-them-at-layer-boundaries)
   - 3.4 [Use guard for Early Exit](#34-use-guard-for-early-exit)
   - 3.5 [Use Optionals Only When Absence Is Meaningful](#35-use-optionals-only-when-absence-is-meaningful)
4. [Memory Management with ARC](#4-memory-management-with-arc) — **HIGH**
   - 4.1 [Capture self Weakly in Stored Closures](#41-capture-self-weakly-in-stored-closures)
   - 4.2 [Declare Delegates as weak](#42-declare-delegates-as-weak)
   - 4.3 [Do Not Add weak self to Non-Escaping Closures](#43-do-not-add-weak-self-to-non-escaping-closures)
5. [SwiftUI App Architecture](#5-swiftui-app-architecture) — **HIGH**
   - 5.1 [Avoid Mutable Singletons](#51-avoid-mutable-singletons)
   - 5.2 [Inject Dependencies Through Protocols and a Composition Root](#52-inject-dependencies-through-protocols-and-a-composition-root)
   - 5.3 [Keep Business Logic out of View Bodies](#53-keep-business-logic-out-of-view-bodies)
   - 5.4 [Keep the Domain Layer Free of UI and Transport](#54-keep-the-domain-layer-free-of-ui-and-transport)
   - 5.5 [Model Navigation as Data](#55-model-navigation-as-data)
   - 5.6 [Use @Observable Models, Not ObservableObject](#56-use-observable-models-not-observableobject)
6. [Repository Structure and Modularization](#6-repository-structure-and-modularization) — **MEDIUM-HIGH**
   - 6.1 [Expose the Minimal Public API per Module](#61-expose-the-minimal-public-api-per-module)
   - 6.2 [Features Depend on Domain Protocols, Not on Each Other](#62-features-depend-on-domain-protocols-not-on-each-other)
   - 6.3 [Group Files by Feature, One Primary Type per File](#63-group-files-by-feature-one-primary-type-per-file)
   - 6.4 [Keep Third-Party Dependencies Few and Justified](#64-keep-third-party-dependencies-few-and-justified)
   - 6.5 [Use a Thin App Target and a Local Swift Package](#65-use-a-thin-app-target-and-a-local-swift-package)
7. [Networking and API Integration](#7-networking-and-api-integration) — **MEDIUM-HIGH**
   - 7.1 [Centralize Requests in One HTTP Client with an Injected Transport](#71-centralize-requests-in-one-http-client-with-an-injected-transport)
   - 7.2 [Decode DTOs and Map Them to Domain Models at the Boundary](#72-decode-dtos-and-map-them-to-domain-models-at-the-boundary)
   - 7.3 [Describe Endpoints as Typed Values](#73-describe-endpoints-as-typed-values)
   - 7.4 [Generate Clients from OpenAPI for Large APIs](#74-generate-clients-from-openapi-for-large-apis)
   - 7.5 [Refresh Tokens Once and Retry 401s Once](#75-refresh-tokens-once-and-retry-401s-once)
   - 7.6 [Retry Only Idempotent Requests with Backoff](#76-retry-only-idempotent-requests-with-backoff)
8. [Persistence and Local Data](#8-persistence-and-local-data) — **MEDIUM-HIGH**
   - 8.1 [Choose the Right Store for Each Kind of Data](#81-choose-the-right-store-for-each-kind-of-data)
   - 8.2 [Pass PersistentIdentifiers, Not Model Objects, Across Actors](#82-pass-persistentidentifiers-not-model-objects-across-actors)
   - 8.3 [Store Secrets in the Keychain](#83-store-secrets-in-the-keychain)
   - 8.4 [Version Your Schema from the First Release](#84-version-your-schema-from-the-first-release)
   - 8.5 [Write SwiftData in the Background with @ModelActor](#85-write-swiftdata-in-the-background-with-modelactor)
9. [Webhooks, Push, and Real-Time](#9-webhooks-push-and-real-time) — **MEDIUM**
   - 9.1 [Expose WebSockets as AsyncThrowingStream with Reconnect and Resync](#91-expose-websockets-as-asyncthrowingstream-with-reconnect-and-resync)
   - 9.2 [Receive Webhooks on the Server, Then Notify the App](#92-receive-webhooks-on-the-server-then-notify-the-app)
   - 9.3 [Register for Push and Handle Delegate Callbacks Off the Main Actor](#93-register-for-push-and-handle-delegate-callbacks-off-the-main-actor)
   - 9.4 [Verify Webhook Signatures and Process Events Idempotently](#94-verify-webhook-signatures-and-process-events-idempotently)
10. [API Design and Code Style](#10-api-design-and-code-style) — **MEDIUM**
   - 10.1 [Design Call Sites That Read Like Prose](#101-design-call-sites-that-read-like-prose)
   - 10.2 [Design Small Protocols with Default Implementations](#102-design-small-protocols-with-default-implementations)
   - 10.3 [Follow Swift Naming Conventions](#103-follow-swift-naming-conventions)
   - 10.4 [Keep Logic in Small Pure Functions, Effects at the Edges](#104-keep-logic-in-small-pure-functions-effects-at-the-edges)
11. [Testing](#11-testing) — **MEDIUM**
   - 11.1 [Run Tests with Thread Sanitizer in CI](#111-run-tests-with-thread-sanitizer-in-ci)
   - 11.2 [Test Through Protocol Fakes, Not the Network](#112-test-through-protocol-fakes-not-the-network)
   - 11.3 [Write Tests with Swift Testing](#113-write-tests-with-swift-testing)
12. [Tooling, Configuration, and Observability](#12-tooling-configuration-and-observability) — **LOW-MEDIUM**
   - 12.1 [Automate Formatting and Linting in CI](#121-automate-formatting-and-linting-in-ci)
   - 12.2 [Configure Environments with xcconfig, Never Ship Secrets](#122-configure-environments-with-xcconfig-never-ship-secrets)
   - 12.3 [Log with Logger, Not print](#123-log-with-logger-not-print)

---

## 1. Concurrency and Data-Race Safety

**Impact: CRITICAL**

Swift 6 turns data races into compile-time errors. Getting isolation right (main actor by default, explicit background work, actors for shared state) prevents crashes that never reproduce locally and keeps the UI responsive.

### 1.1 Bridge Callback APIs with Continuations and AsyncStream

**Impact: MEDIUM (one async style across the codebase)**

Wrap one-shot callback APIs with `withCheckedThrowingContinuation` and event-style APIs with `AsyncStream`. A checked continuation must be resumed exactly once; resuming twice traps and never resuming leaks the awaiting task. Always set `onTermination` on a stream so the underlying observer stops when the consumer stops iterating.

**Incorrect (callbacks leak into feature code; continuation may never resume):**

```swift
func loadConfig(client: LegacyConfigClient) async throws -> Config {
    try await withCheckedThrowingContinuation { continuation in
        client.fetch { config, error in
            if let config { continuation.resume(returning: config) }
            if let error { continuation.resume(throwing: error) }
            // both nil: never resumed. Both non-nil: resumed twice (crash).
        }
    }
}
```

**Correct (every path resumes exactly once; stream cleans up):**

```swift
func loadConfig(client: LegacyConfigClient) async throws -> Config {
    try await withCheckedThrowingContinuation { continuation in
        client.fetch { config, error in
            if let config {
                continuation.resume(returning: config)
            } else {
                continuation.resume(throwing: error ?? ConfigError.emptyResponse)
            }
        }
    }
}

func priceUpdates(feed: LegacyPriceFeed) -> AsyncStream<Price> {
    AsyncStream { continuation in
        let token = feed.subscribe { price in
            continuation.yield(price)
        }
        continuation.onTermination = { _ in
            feed.unsubscribe(token)
        }
    }
}

// Consumer: iteration ends and unsubscribes when the enclosing task is cancelled.
// for await price in priceUpdates(feed: feed) { render(price) }
```

`LegacyConfigClient` and `LegacyPriceFeed` stand for any callback-based SDK. The closures passed to them must be `Sendable` in Swift 6, so the SDK types must be `Sendable` or wrapped in an actor.

Reference: [CheckedContinuation](https://developer.apple.com/documentation/swift/checkedcontinuation), [AsyncStream](https://developer.apple.com/documentation/swift/asyncstream)

### 1.2 Do Not Assume Actor State Survives an Await

**Impact: HIGH (prevents duplicate work and stale-state bugs)**

Actors are reentrant. At every `await` inside an actor method, other callers can run and change the actor's state. Check-then-await-then-write sequences break: two callers both see "no token", both start a refresh, and the second overwrites the first. Record in-flight work before the first `await` so later callers join it.

**Incorrect (concurrent callers each start their own refresh):**

```swift
actor TokenStore {
    private var token: String?

    func validToken(refresh: @Sendable () async throws -> String) async throws -> String {
        if let token { return token }
        let newToken = try await refresh() // other callers enter here and refresh again
        token = newToken
        return newToken
    }
}
```

**Correct (store the in-flight task before suspending; everyone awaits the same task):**

```swift
actor TokenStore {
    private var token: String?
    private var refreshTask: Task<String, any Error>?

    func validToken(
        refresh: @escaping @Sendable () async throws -> String
    ) async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    func invalidate() {
        token = nil
    }
}
```

General rule: after any `await` inside an actor, re-read state instead of trusting values read before the suspension.

Reference: [SE-0306 Actors: Actor reentrancy](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md#actor-reentrancy)

### 1.3 Do Not Silence Sendable Errors with Unsafe Escapes

**Impact: CRITICAL (keeps the compiler's race detection intact)**

A Sendable or isolation error is a data race the compiler found for you. `@unchecked Sendable`, `nonisolated(unsafe)`, and `@preconcurrency import` turn the check off without fixing anything. Fix the design instead: make the type a value type, make it immutable, move the state into an actor, or keep it on the main actor. Use an unsafe escape only when you have real synchronization, and document it.

**Incorrect (mutable class marked Sendable to make an error go away):**

```swift
final class SessionState: @unchecked Sendable {
    var userID: String?     // mutated from several tasks, no synchronization
    var isRefreshing = false
}

nonisolated(unsafe) var sharedSession = SessionState()
```

**Correct (immutable value type, or real synchronization documented):**

```swift
import Synchronization

// Option 1: an immutable value type is Sendable automatically.
struct SessionSnapshot: Sendable {
    let userID: String?
    let isRefreshing: Bool
}

// Option 2: state that must be shared lives in an actor.
actor SessionStore {
    private(set) var snapshot = SessionSnapshot(userID: nil, isRefreshing: false)
    func update(_ newValue: SessionSnapshot) { snapshot = newValue }
}

// Option 3: synchronous access with a real lock (iOS 18 / macOS 15).
final class Counter: Sendable {
    private let value = Mutex(0) // Mutex is Sendable; access is synchronized
    func increment() -> Int {
        value.withLock { count in
            count += 1
            return count
        }
    }
}
```

Reference: [Swift 6 Migration Guide: Common Problems](https://www.swift.org/migration/documentation/migrationguide)

### 1.4 Enable Swift 6 Mode and Approachable Concurrency

**Impact: CRITICAL (data races become compile errors)**

In the Swift 6 language mode the compiler rejects code that could race. Approachable Concurrency (Swift 6.2+) makes this practical: nonisolated `async` functions run on the caller's actor instead of jumping to a background thread (SE-0461), and isolated conformances are inferred. Default main-actor isolation (SE-0466) makes unannotated code in a module run on the main actor, so an app is single-threaded until you opt into concurrency.

New Xcode app projects enable these settings by default. Swift packages do not: you must opt in per target in `Package.swift`.

**Incorrect (package target on defaults: nonisolated async code silently hops to the global pool, producing Sendable errors and races):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    targets: [
        .target(name: "FeatureUsers"),
    ]
)
```

**Correct (Swift 6 mode, approachable concurrency features, main-actor default for UI modules):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let approachableConcurrency: [SwiftSetting] = [
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("InferIsolatedConformances"),
]

let uiModule: [SwiftSetting] = approachableConcurrency + [
    .defaultIsolation(MainActor.self),
]

let package = Package(
    name: "AppCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    targets: [
        .target(name: "Networking", swiftSettings: approachableConcurrency),
        .target(name: "FeatureUsers", dependencies: ["Networking"], swiftSettings: uiModule),
    ],
    swiftLanguageModes: [.v6]
)
```

In Xcode app targets check Build Settings → Swift Compiler – Concurrency: Swift Language Version = 6, Approachable Concurrency = Yes, Default Actor Isolation = MainActor. Keep non-UI modules (networking, domain, persistence) on the default `nonisolated` isolation.

Reference: [SE-0466 Control default actor isolation inference](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md), [SE-0461 Run nonisolated async functions on the caller's actor by default](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md)

### 1.5 Keep UI State on the Main Actor

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

### 1.6 Offload CPU-Heavy Work with @concurrent

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

### 1.7 Pass Value Types Across Isolation Boundaries

**Impact: HIGH (Sendable by construction, no copies to synchronize)**

Data that moves between the main actor, actors, and background functions must be `Sendable`. Structs and enums whose stored properties are `Sendable` qualify automatically (public types need an explicit `: Sendable`). Classes with mutable state do not. Model data crossing boundaries as value types: DTOs, snapshots, identifiers. Never pass framework objects that are tied to one context, such as SwiftData `@Model` instances.

**Incorrect (mutable reference type sent to a background function):**

```swift
final class Draft {
    var title = ""
    var body = ""
}

nonisolated struct Uploader {
    @concurrent
    func upload(_ draft: Draft) async throws { /* ... */ } // Draft is not Sendable
}
```

**Correct (immutable value type crosses the boundary):**

```swift
import Foundation

struct DraftPayload: Sendable, Codable {
    let title: String
    let body: String
}

nonisolated struct Uploader {
    @concurrent
    func upload(_ draft: DraftPayload) async throws -> Data {
        try JSONEncoder().encode(draft)
    }
}
```

When an object must stay a class, convert it to a snapshot struct at the boundary (`draft.payload`) instead of sending the object itself.

Reference: [Sendable](https://developer.apple.com/documentation/swift/sendable)

### 1.8 Protect Shared Mutable State with an Actor

**Impact: CRITICAL (eliminates data races without locks)**

When mutable state is accessed from several tasks or isolation domains (a cache, a session, a token store, a connection registry), put it in an `actor`. The actor runs one task at a time on its state, so no locks are needed, and the compiler forces callers to `await`. Do not make every service an actor: stateless services should be `Sendable` structs, and UI state belongs on `@MainActor`.

**Incorrect (class with a dictionary mutated from concurrent tasks):**

```swift
final class ImageCache {
    private var storage: [URL: Data] = [:] // concurrent reads and writes race

    func data(for url: URL) -> Data? { storage[url] }
    func insert(_ data: Data, for url: URL) { storage[url] = data }
}
```

**Correct (actor serializes access, callers await):**

```swift
import Foundation

actor ImageCache {
    private var storage: [URL: Data] = [:]
    private let limit: Int

    init(limit: Int = 200) {
        self.limit = limit
    }

    func data(for url: URL) -> Data? {
        storage[url]
    }

    func insert(_ data: Data, for url: URL) {
        if storage.count >= limit, let firstKey = storage.keys.first {
            storage[firstKey] = nil
        }
        storage[url] = data
    }

    nonisolated var debugName: String { "ImageCache" } // no state access, no await needed
}

// Usage from any context
func cachedImage(_ url: URL, cache: ImageCache) async -> Data? {
    await cache.data(for: url)
}
```

If you need a synchronous critical section (for example inside a non-async API), use `Mutex` from the `Synchronization` module (iOS 18 / macOS 15) instead of building an actor around a lock.

Reference: [Swift Concurrency: Actors](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Actors)

### 1.9 Support Cooperative Cancellation

**Impact: HIGH (stops wasted work when the user leaves)**

Cancellation in Swift is cooperative: `task.cancel()` only sets a flag. System APIs (`URLSession`, `Task.sleep`) react to it, but your own loops must check with `try Task.checkCancellation()` or `Task.isCancelled`. A cancelled task throws `CancellationError`, which is not a failure to show the user.

**Incorrect (long loop ignores cancellation, cancellation shown as an error):**

```swift
@MainActor
final class UploadModel {
    var errorMessage: String?

    func uploadAll(_ chunks: [Data], uploader: some ChunkUploader) async {
        do {
            for chunk in chunks {
                try await uploader.upload(chunk) // keeps going after the screen is closed
            }
        } catch {
            errorMessage = error.localizedDescription // "cancelled" alert on dismiss
        }
    }
}
```

**Correct (check between units of work, treat cancellation as silent):**

```swift
import Foundation

@MainActor
final class UploadModel {
    var errorMessage: String?

    func uploadAll(_ chunks: [Data], uploader: some ChunkUploader) async {
        do {
            for chunk in chunks {
                try Task.checkCancellation()
                try await uploader.upload(chunk)
            }
        } catch is CancellationError {
            // The user left; nothing to report.
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

protocol ChunkUploader: Sendable {
    func upload(_ chunk: Data) async throws
}
```

`URLSession` throws `URLError(.cancelled)` rather than `CancellationError` when its task is cancelled. Map it to your own `cancelled` case in the networking layer.

Reference: [Task Cancellation](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Task-Cancellation)

### 1.10 Tie Task Lifetime to the UI with .task

**Impact: HIGH (automatic cancellation, no leaked work)**

`Task { }` started from `onAppear` keeps running after the view disappears, and it holds `self` strongly for its whole lifetime. The `.task` modifier starts when the view appears and is cancelled automatically when it disappears. `.task(id:)` restarts when the value changes, which replaces debounced `onChange` plus manual task bookkeeping. If you must create an unstructured task outside SwiftUI, store it and cancel it.

**Incorrect (fire-and-forget tasks that outlive the screen):**

```swift
import SwiftUI

struct SearchView: View {
    @State private var model = SearchModel()

    var body: some View {
        List(model.results) { Text($0.title) }
            .onAppear { Task { await model.observeUpdates() } } // never cancelled
            .onChange(of: model.query) { Task { await model.search() } } // races between keystrokes
    }
}
```

**Correct (lifetime bound to the view; restarts on change):**

```swift
import SwiftUI

struct SearchView: View {
    @State private var model = SearchModel()

    var body: some View {
        List(model.results) { Text($0.title) }
            .searchable(text: $model.query)
            .task { await model.observeUpdates() }
            .task(id: model.query) {
                try? await Task.sleep(for: .milliseconds(300)) // debounce; throws if cancelled
                guard !Task.isCancelled else { return }
                await model.search()
            }
    }
}
```

Outside SwiftUI, keep a handle: `private var observation: Task<Void, Never>?`, assign it when starting, and call `observation?.cancel()` when the owner stops.

Reference: [task(priority:_:)](https://developer.apple.com/documentation/swiftui/view/task(priority:_:))

### 1.11 Use async let for Independent Calls

**Impact: CRITICAL (N round trips become 1)**

Sequential `await`s on independent operations form a waterfall: each one waits for the previous to finish. `async let` starts child tasks immediately and runs them in parallel. It is the structured equivalent of `Promise.all`: if one throws, the others are cancelled automatically, and the function cannot return until all children finish.

**Incorrect (three sequential round trips):**

```swift
func loadDashboard(api: some DashboardAPI) async throws -> Dashboard {
    let profile = try await api.profile()
    let stats = try await api.stats()
    let alerts = try await api.alerts()
    return Dashboard(profile: profile, stats: stats, alerts: alerts)
}
```

**Correct (three parallel child tasks):**

```swift
func loadDashboard(api: some DashboardAPI) async throws -> Dashboard {
    async let profile = api.profile()
    async let stats = api.stats()
    async let alerts = api.alerts()
    return try await Dashboard(profile: profile, stats: stats, alerts: alerts)
}

protocol DashboardAPI: Sendable {
    func profile() async throws -> Profile
    func stats() async throws -> Stats
    func alerts() async throws -> [Alert]
}
```

Use `async let` for a fixed, small number of calls. For a dynamic number, use a task group. Values captured by `async let` initializers must be `Sendable`, so pass dependencies as parameters or local constants rather than reading main-actor properties inside the initializer.

Reference: [Swift Concurrency: Calling Asynchronous Functions in Parallel](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Calling-Asynchronous-Functions-in-Parallel)

### 1.12 Use Task Groups for Dynamic Fan-Out

**Impact: HIGH (parallelism with cancellation and backpressure)**

For a variable number of parallel operations use `withThrowingTaskGroup`. Child tasks cannot outlive the group, a thrown error cancels the siblings, and you can bound concurrency so you do not open hundreds of connections at once. Child task closures are `@Sendable`, so copy main-actor properties into local constants before the group.

**Incorrect (unstructured tasks, no limit, main-actor state read from child tasks):**

```swift
@MainActor
final class UsersModel {
    let api: UsersAPI
    var users: [User.ID: User] = [:]

    init(api: UsersAPI) { self.api = api }

    func load(ids: [User.ID]) {
        for id in ids {
            Task.detached {
                let user = try await self.api.user(id: id) // isolated property read off the main actor
                await MainActor.run { self.users[id] = user }
            }
        }
    }
}
```

**Correct (structured group with a concurrency limit):**

```swift
func fetchUsers(
    ids: [User.ID],
    api: some UsersAPI,
    maxConcurrent: Int = 4
) async throws -> [User.ID: User] {
    try await withThrowingTaskGroup(of: (User.ID, User).self) { group in
        var result: [User.ID: User] = [:]
        var iterator = ids.makeIterator()

        // Seed the group up to the limit.
        for _ in 0..<maxConcurrent {
            guard let id = iterator.next() else { break }
            group.addTask { (id, try await api.user(id: id)) }
        }
        // Each time one finishes, start the next.
        while let finished = try await group.next() {
            let (id, user) = finished
            result[id] = user
            if let nextID = iterator.next() {
                group.addTask { (nextID, try await api.user(id: nextID)) }
            }
        }
        return result
    }
}

protocol UsersAPI: Sendable {
    func user(id: User.ID) async throws -> User
}
```

Call it from the main actor with `users = try await fetchUsers(ids: ids, api: api)`. The `api` value is passed in as a `Sendable` parameter, so child tasks never touch main-actor state.

Reference: [Swift Concurrency: Task Groups](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Task-Groups)

---

## 2. Data Modeling and Value Semantics

**Impact: CRITICAL**

Value types, enums with associated values, and strong types eliminate whole classes of bugs (shared mutation, impossible states, mixed-up IDs) before the code ever runs.

### 2.1 Avoid default in Switches over Your Own Enums

**Impact: HIGH (new cases surface as compile errors)**

`switch` must be exhaustive. When you list every case of your own enum, adding a case later breaks the build at every switch that needs updating. A `default:` branch silently swallows the new case. Keep `default` for open sets (integers, strings) and use `@unknown default` for enums from frameworks that may add cases.

**Incorrect (new `refunded` case silently falls into default):**

```swift
enum PaymentStatus {
    case pending, paid, failed, refunded
}

func badgeColor(for status: PaymentStatus) -> String {
    switch status {
    case .paid: "green"
    case .failed: "red"
    default: "gray" // refunded is shown as pending-gray, no warning
    }
}
```

**Correct (exhaustive over own cases; @unknown default for framework enums):**

```swift
import UserNotifications

func badgeColor(for status: PaymentStatus) -> String {
    switch status {
    case .pending: "gray"
    case .paid: "green"
    case .failed: "red"
    case .refunded: "blue"
    }
}

func describe(_ status: UNAuthorizationStatus) -> String {
    switch status {
    case .authorized: "Allowed"
    case .denied: "Denied"
    case .notDetermined: "Not asked yet"
    case .provisional, .ephemeral: "Limited"
    @unknown default: "Unknown"
    }
}
```

Reference: [Switch](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Switch)

### 2.2 Make Impossible States Unrepresentable with Enums

**Impact: CRITICAL (removes invalid state combinations)**

Several booleans and optionals that describe one state (`isLoading`, `error`, `data`) allow combinations that make no sense, such as loading with an error and data at the same time. An enum with associated values (Swift's discriminated union) allows only the legal states, and `switch` forces every state to be handled.

**Incorrect (8 combinations, 5 of them invalid):**

```swift
@MainActor
@Observable
final class OrdersModel {
    var isLoading = false
    var error: (any Error)?
    var orders: [Order]?
}
```

**Correct (one enum, exactly the legal states):**

```swift
enum LoadState<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(any Error)
}

@MainActor
@Observable
final class OrdersModel {
    private(set) var state: LoadState<[Order]> = .idle
}

func title(for state: LoadState<[Order]>) -> String {
    switch state {
    case .idle: "Pull to refresh"
    case .loading: "Loading…"
    case .loaded(let orders) where orders.isEmpty: "No orders yet"
    case .loaded(let orders): "\(orders.count) orders"
    case .failed(let error): "Error: \(error.localizedDescription)"
    }
}
```

An enum with no cases (`enum API {}`) is the idiomatic namespace for static constants and functions because it cannot be instantiated.

Reference: [Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)

### 2.3 Mark Classes final and Prefer Composition

**Impact: MEDIUM (static dispatch and simpler reasoning)**

Unless a class is designed for subclassing, mark it `final`. It enables static dispatch, makes `Sendable` conformance possible for immutable classes, and documents intent. Share behavior through protocols and composition (wrapping one implementation in another) instead of inheritance hierarchies.

**Incorrect (inheritance chain for behavior reuse):**

```swift
class BaseRepository {
    func log(_ message: String) { print(message) }
}

class UserRepository: BaseRepository {
    func user(id: String) async throws -> User { /* ... */ fatalError() }
}

class CachedUserRepository: UserRepository { /* overrides everything */ }
```

**Correct (protocol plus composable final types):**

```swift
protocol UserRepository: Sendable {
    func user(id: User.ID) async throws -> User
}

struct RemoteUserRepository: UserRepository {
    let client: HTTPClient
    func user(id: User.ID) async throws -> User {
        try User(dto: await client.send(UsersEndpoints.user(id: id)))
    }
}

struct CachedUserRepository: UserRepository {
    let wrapped: any UserRepository
    let cache: UserCache // actor

    func user(id: User.ID) async throws -> User {
        if let cached = await cache.user(id: id) { return cached }
        let user = try await wrapped.user(id: id)
        await cache.store(user)
        return user
    }
}
```

Reference: [Inheritance](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/inheritance/)

### 2.4 Model Data with Structs by Default

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

### 2.5 Prefer some and Generics over any

**Impact: MEDIUM (static dispatch, no boxing)**

`some P` (an opaque type, shorthand for a generic parameter) means one concrete type known to the compiler: static dispatch, inlining, no allocation. `any P` (an existential) is a box that can hold any conforming type: dynamic dispatch, possible heap allocation, and lost type information. Start with `some` or generics; use `any` when you truly need heterogeneous storage or a type chosen at runtime. Stored dependencies at module boundaries are a reasonable place for `any`.

**Incorrect (existentials everywhere, including hot paths and homogeneous data):**

```swift
func totalArea(of shapes: [any Shape]) -> Double { // every element boxed
    shapes.reduce(0) { $0 + $1.area }
}

func render(_ shape: any Shape) -> String {
    "Area: \(shape.area)"
}
```

**Correct (generics for homogeneous data, any only where heterogeneity is real):**

```swift
protocol Shape {
    var area: Double { get }
}

func totalArea<S: Shape>(of shapes: [S]) -> Double {
    shapes.reduce(0) { $0 + $1.area }
}

func render(_ shape: some Shape) -> String {
    "Area: \(shape.area)"
}

struct Circle: Shape { let radius: Double; var area: Double { .pi * radius * radius } }
struct Square: Shape { let side: Double; var area: Double { side * side } }

// Heterogeneous collection: any is the right tool here.
let mixed: [any Shape] = [Circle(radius: 1), Square(side: 2)]
let mixedArea = mixed.reduce(0) { $0 + $1.area }
```

Reference: [Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)

### 2.6 Use Strongly Typed Identifiers

**Impact: HIGH (mixed-up IDs become compile errors)**

Swift typing is nominal: two types with the same shape are still different types. Use that to stop passing a user ID where an order ID is expected. A generic `Tagged` wrapper with a phantom tag gives every entity its own ID type at zero runtime cost. Implement `Codable` as a single value so the JSON stays a plain string or UUID.

**Incorrect (all identifiers are raw UUIDs):**

```swift
import Foundation

func cancel(orderID: UUID) async throws { /* ... */ }

let userID = UUID()
try await cancel(orderID: userID) // compiles, cancels the wrong thing
```

**Correct (one ID type per entity):**

```swift
import Foundation

struct Tagged<Tag, RawValue: Hashable & Sendable>: Hashable, Sendable {
    let rawValue: RawValue
    init(_ rawValue: RawValue) { self.rawValue = rawValue }
}

extension Tagged: Codable where RawValue: Codable {
    init(from decoder: any Decoder) throws {
        rawValue = try decoder.singleValueContainer().decode(RawValue.self)
    }
    func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

struct User: Identifiable, Hashable, Codable, Sendable {
    typealias ID = Tagged<User, UUID>
    let id: ID
    var name: String
}

struct Order: Identifiable, Hashable, Codable, Sendable {
    typealias ID = Tagged<Order, UUID>
    let id: ID
    var total: Decimal
}

func cancel(orderID: Order.ID) async throws { /* ... */ }
// cancel(orderID: user.id) — compile error: User.ID is not Order.ID
```

The tag type parameter is never stored, so `Hashable` and `Sendable` synthesis do not require anything of `Tag`. The `swift-tagged` package from Point-Free provides a production-ready version.

Reference: [Value and Reference Types](https://www.swift.org/documentation/articles/value-and-reference-types.html)

---

## 3. Optionals and Error Handling

**Impact: HIGH**

Optionals and typed errors make failure explicit. Force-unwrapping and swallowing errors turn recoverable situations into crashes or silent data loss.

### 3.1 Do Not Swallow Errors with try?

**Impact: MEDIUM (failures stay visible and debuggable)**

`try?` converts any error into `nil` and discards the reason. Use it only when absence is a genuinely acceptable outcome (an optional cache read, a best-effort cleanup). Everywhere else, propagate with `try` or handle and log the error.

**Incorrect (save failures disappear; user thinks data was saved):**

```swift
func saveNote(_ note: Note, store: NoteStore) async {
    try? await store.save(note)
}
```

**Correct (propagate, or handle and log):**

```swift
import OSLog

private let logger = Logger(subsystem: "com.example.notes", category: "storage")

func saveNote(_ note: Note, store: NoteStore) async throws {
    try await store.save(note)
}

func warmCache(store: NoteStore) async {
    do {
        try await store.preload()
    } catch {
        // Best effort, but still recorded.
        logger.error("Cache warm-up failed: \(error.localizedDescription, privacy: .public)")
    }
}

// Acceptable try?: absence is a normal outcome.
func cachedNote(id: Note.ID, store: NoteStore) async -> Note? {
    try? await store.cachedNote(id: id)
}
```

Reference: [Converting Errors to Optional Values](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/#Converting-Errors-to-Optional-Values)

### 3.2 Never Force-Unwrap Runtime Data

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

### 3.3 Throw Domain Errors and Map Them at Layer Boundaries

**Impact: HIGH (UI never depends on transport details)**

Define errors as enums conforming to `Error`, with associated values that carry context. Convert low-level errors (`URLError`, `DecodingError`, SQLite errors) into your own types at the boundary of the layer that produced them, so features never import transport details. Swift 6 typed throws (`throws(NetworkError)`) make the error type part of the signature; use them for closed, stable error sets inside a module, and keep untyped `throws` on public APIs that may evolve.

**Incorrect (raw URLError reaches the UI; errors carry no context):**

```swift
import Foundation

@MainActor
final class CheckoutModel {
    var message = ""
    func pay(client: PaymentsClient) async {
        do {
            try await client.pay()
        } catch let error as URLError where error.code == .notConnectedToInternet {
            message = "Offline" // every feature repeats transport-specific checks
        } catch {
            message = "\(error)" // leaks internals to users
        }
    }
}
```

**Correct (layer maps errors once; features switch over a domain enum):**

```swift
import Foundation

enum PaymentError: Error, Equatable {
    case offline
    case cardDeclined(reason: String)
    case server(statusCode: Int)
    case unknown
}

struct PaymentsClient: Sendable {
    let transport: any HTTPTransport

    func pay(_ request: URLRequest) async throws(PaymentError) {
        do {
            let (_, response) = try await transport.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw PaymentError.unknown }
            switch http.statusCode {
            case 200..<300: return
            case 402: throw PaymentError.cardDeclined(reason: "insufficient_funds")
            default: throw PaymentError.server(statusCode: http.statusCode)
            }
        } catch let error as PaymentError {
            throw error
        } catch let error as URLError where error.code == .notConnectedToInternet {
            throw .offline
        } catch {
            throw .unknown
        }
    }
}

@MainActor
final class CheckoutModel {
    var message = ""
    func pay(client: PaymentsClient, request: URLRequest) async {
        do throws(PaymentError) {
            try await client.pay(request)
            message = "Paid"
        } catch {
            // `do throws(PaymentError)` makes `error` statically PaymentError: the switch is exhaustive.
            switch error {
            case .offline: message = "You're offline."
            case .cardDeclined: message = "Your card was declined."
            case .server, .unknown: message = "Something went wrong. Try again."
            }
        }
    }
}
```

Reference: [SE-0413 Typed throws](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md), [Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/)

### 3.4 Use guard for Early Exit

**Impact: MEDIUM (flat happy path, unwrapped values in scope)**

`guard` validates preconditions at the top of a function and exits early. Values unwrapped by `guard let` stay in scope for the rest of the function, so the happy path is not nested. Since Swift 5.7, `if let name` and `guard let name` unwrap a variable into a shadow of the same name.

**Incorrect (pyramid of nested if-lets):**

```swift
func sendInvite(to email: String?, team: Team?) async throws {
    if let email {
        if let team {
            if team.canInvite {
                try await api.invite(email: email, teamID: team.id)
            }
        }
    }
}
```

**Correct (guard clauses, then the happy path):**

```swift
func sendInvite(to email: String?, team: Team?) async throws {
    guard let email, !email.isEmpty else { throw InviteError.missingEmail }
    guard let team else { throw InviteError.missingTeam }
    guard team.canInvite else { throw InviteError.notAllowed }

    try await api.invite(email: email, teamID: team.id)
}

enum InviteError: Error {
    case missingEmail, missingTeam, notAllowed
}
```

Reference: [Early Exit](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Early-Exit)

### 3.5 Use Optionals Only When Absence Is Meaningful

**Impact: MEDIUM (fewer unwraps, clearer domain)**

A non-optional value can never be `nil`; the compiler guarantees it. Making properties optional "just in case" spreads unwrapping (and force-unwrapping) through the codebase and hides which values really can be missing. Make a property optional only when "not present" is a real state in the domain, and require everything else in the initializer.

**Incorrect (everything optional, set later, unwrapped everywhere):**

```swift
import Foundation

final class Invoice {
    var id: UUID?
    var number: String?
    var issuedAt: Date?
    var paidAt: Date?
}

func label(for invoice: Invoice) -> String {
    "Invoice \(invoice.number!) issued \(invoice.issuedAt!)"
}
```

**Correct (required data is required; only paidAt can be absent):**

```swift
import Foundation

struct Invoice: Identifiable, Sendable {
    let id: UUID
    let number: String
    let issuedAt: Date
    var paidAt: Date? // nil means "not paid yet": a real domain state

    var isPaid: Bool { paidAt != nil }
}

func label(for invoice: Invoice) -> String {
    "Invoice \(invoice.number) issued \(invoice.issuedAt.formatted(date: .abbreviated, time: .omitted))"
}
```

Reference: [The Basics: Optionals](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/#Optionals)

---

## 4. Memory Management with ARC

**Impact: HIGH**

Swift uses reference counting, not a garbage collector. Reference cycles leak memory and keep work running after the user has left the screen.

### 4.1 Capture self Weakly in Stored Closures

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

### 4.2 Declare Delegates as weak

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

### 4.3 Do Not Add weak self to Non-Escaping Closures

**Impact: LOW-MEDIUM (less noise, no accidental early exits)**

Closures that run immediately and are not stored (`map`, `filter`, `sorted`, `withAnimation`, SwiftUI view builders) cannot create a retain cycle. Adding `[weak self]` there is noise and can skip work if you bail out with `guard let self else { return }`. Short-lived `Task { }` closures hold `self` only until they finish, which is usually fine; long-running tasks should be cancelled instead (see `concurrency-structured-tasks`).

**Incorrect (weak capture where no cycle is possible):**

```swift
@MainActor
final class CartModel {
    var items: [CartItem] = []

    var total: Decimal {
        items.reduce(0) { [weak self] sum, item in
            guard let self else { return sum } // pointless
            return sum + item.price * Decimal(item.quantity) + self.fee(for: item)
        }
    }

    func fee(for item: CartItem) -> Decimal { 0 }
}
```

**Correct (plain capture in non-escaping closures):**

```swift
@MainActor
final class CartModel {
    var items: [CartItem] = []

    var total: Decimal {
        items.reduce(0) { sum, item in
            sum + item.price * Decimal(item.quantity) + fee(for: item)
        }
    }

    func fee(for item: CartItem) -> Decimal { 0 }
}
```

Reference: [Escaping Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/#Escaping-Closures)

---

## 5. SwiftUI App Architecture

**Impact: HIGH**

Observable models, injected dependencies, and navigation as data keep views thin, testable, and fast to re-render.

### 5.1 Avoid Mutable Singletons

**Impact: HIGH (removes hidden dependencies and global races)**

`static let shared` holding mutable state is a hidden global: any code can change it, tests interfere with each other (Swift Testing runs tests in parallel), and in Swift 6 a non-Sendable global is a compile error. Inject the dependency instead. If the state is genuinely app-wide and shared across tasks, own one instance in the composition root and make it an actor or `@MainActor`.

**Incorrect (global mutable session reached from anywhere):**

```swift
final class Session {
    static let shared = Session() // Swift 6: "not concurrency-safe" error in nonisolated modules
    var currentUser: User?
    var authToken: String?
}

struct ProfileRepository {
    func load() async throws -> Profile {
        guard let token = Session.shared.authToken else { throw AuthError.signedOut }
        return try await fetchProfile(token: token)
    }
}
```

**Correct (isolated state, created once at the root, injected):**

```swift
actor SessionStore {
    private(set) var currentUser: User?
    private(set) var authToken: String?

    func signIn(user: User, token: String) {
        currentUser = user
        authToken = token
    }

    func signOut() {
        currentUser = nil
        authToken = nil
    }
}

struct ProfileRepository: Sendable {
    let session: SessionStore

    func load() async throws -> Profile {
        guard let token = await session.authToken else { throw AuthError.signedOut }
        return try await fetchProfile(token: token)
    }
}
```

Stateless singletons of `Sendable` types (`URLSession.shared`, a `Logger`) are fine.

Reference: [Swift 6 Migration Guide: Global Variables](https://www.swift.org/migration/documentation/migrationguide)

### 5.2 Inject Dependencies Through Protocols and a Composition Root

**Impact: HIGH (testable features, previews without network)**

Features depend on protocols, never on concrete clients. One place, the composition root in the `App` struct, builds the live implementations and hands them down. Pass dependencies through initializers; use the SwiftUI environment for app-wide services. Mark the dependency container `nonisolated` and `Sendable` so it can be an environment default value regardless of the module's default isolation.

**Incorrect (feature constructs its own concrete dependencies):**

```swift
import SwiftUI

@MainActor
@Observable
final class UserListModel {
    private let repository = RemoteUserRepository(
        client: HTTPClient(baseURL: URL(string: "https://api.example.com")!)
    ) // untestable, no previews without network, URL hard-coded in a feature

    var users: [User] = []
}
```

**Correct (protocol dependency, container in the environment, live wiring at the root):**

```swift
import SwiftUI

protocol UserRepository: Sendable {
    func allUsers() async throws -> [User]
    func user(id: User.ID) async throws -> User
}

nonisolated struct AppDependencies: Sendable {
    var userRepository: any UserRepository

    static let preview = AppDependencies(userRepository: InMemoryUserRepository(users: User.samples))

    @MainActor // the composition root runs on the main actor
    static func live(config: AppConfig) -> AppDependencies {
        let client = HTTPClient(baseURL: config.apiBaseURL)
        return AppDependencies(userRepository: RemoteUserRepository(client: client))
    }
}

extension EnvironmentValues {
    @Entry var dependencies: AppDependencies = .preview
}

@main
struct ShopApp: App {
    private let dependencies = AppDependencies.live(config: .current)

    var body: some Scene {
        WindowGroup {
            UsersScreen()
                .environment(\.dependencies, dependencies)
        }
    }
}

struct UsersScreen: View {
    @Environment(\.dependencies) private var dependencies

    var body: some View {
        UserListView(repository: dependencies.userRepository)
    }
}

struct UserListView: View {
    @State private var model: UserListModel

    init(repository: any UserRepository) {
        // @State keeps the first instance; keep model init cheap (no work in init).
        _model = State(initialValue: UserListModel(repository: repository))
    }

    var body: some View {
        List(model.users) { Text($0.name) }
            .task { await model.load() }
    }
}

#Preview {
    UserListView(repository: InMemoryUserRepository(users: User.samples))
}
```

For larger apps, Point-Free's `swift-dependencies` package offers the same idea with less boilerplate.

Reference: [EnvironmentValues](https://developer.apple.com/documentation/swiftui/environmentvalues)

### 5.3 Keep Business Logic out of View Bodies

**Impact: HIGH (body runs on every render)**

A SwiftUI `View` is a cheap value that describes UI, like a JSX element. `body` can run many times per second. Do not sort, filter, format, or call services inside it. Put logic in the model (computed properties, methods), keep `body` a declarative mapping from state to views, and split large bodies into small subviews.

**Incorrect (filtering, sorting, and formatter allocation inside body):**

```swift
import SwiftUI

struct TransactionsView: View {
    let transactions: [CardTransaction]
    @State private var query = ""

    var body: some View {
        let visible = transactions
            .filter { query.isEmpty || $0.merchant.localizedCaseInsensitiveContains(query) }
            .sorted { $0.date > $1.date }
        let formatter = NumberFormatter() // allocated on every render
        formatter.numberStyle = .currency

        return List(visible) { tx in
            Text("\(tx.merchant): \(formatter.string(from: tx.amount as NSNumber) ?? "")")
        }
        .searchable(text: $query)
    }
}
```

**Correct (model owns the logic; body only maps state to views):**

```swift
import SwiftUI

@MainActor
@Observable
final class TransactionsModel {
    var query = ""
    private(set) var transactions: [CardTransaction] = []

    init(transactions: [CardTransaction]) {
        self.transactions = transactions.sorted { $0.date > $1.date }
    }

    var visible: [CardTransaction] {
        guard !query.isEmpty else { return transactions }
        return transactions.filter { $0.merchant.localizedCaseInsensitiveContains(query) }
    }
}

struct TransactionsView: View {
    @State var model: TransactionsModel

    var body: some View {
        List(model.visible) { TransactionRow(transaction: $0) }
            .searchable(text: $model.query)
    }
}

struct TransactionRow: View {
    let transaction: CardTransaction

    var body: some View {
        LabeledContent(transaction.merchant) {
            Text(transaction.amount, format: .currency(code: transaction.currencyCode))
        }
    }
}
```

`Text(_:format:)` uses cached `FormatStyle`s; prefer it over hand-built formatters in views.

Reference: [SwiftUI Essentials](https://developer.apple.com/videos/play/wwdc2024/10150/)

### 5.4 Keep the Domain Layer Free of UI and Transport

**Impact: HIGH (domain logic testable in milliseconds)**

Dependencies point inward: views depend on feature models, feature models depend on domain protocols, and the data layer implements those protocols. The domain layer (entities, business rules, repository protocols) imports only Foundation: no SwiftUI, no URLSession, no SwiftData. Map domain values to UI concepts (colors, icons, strings) in the UI layer.

```text
View (SwiftUI)  →  Feature model (@Observable, @MainActor)
                         ↓ protocol
                   Domain (structs, enums, protocols, rules)
                         ↑ implements
                   Data (HTTP client, persistence, repositories)
```

**Incorrect (domain entity imports SwiftUI and knows about colors):**

```swift
import SwiftUI

struct Subscription {
    let plan: String
    let renewsAt: Date
    var badgeColor: Color { plan == "pro" ? .purple : .gray }
}
```

**Correct (pure domain; UI mapping lives in the UI module):**

```swift
// Domain module
import Foundation

enum Plan: String, Codable, Sendable { case free, pro, team }

struct Subscription: Sendable, Equatable {
    let plan: Plan
    let renewsAt: Date
    let autoRenew: Bool

    func isExpiring(within days: Int, now: Date = .now) -> Bool {
        renewsAt.timeIntervalSince(now) < Double(days) * 86_400
    }
}

// DesignSystem or feature module
import SwiftUI

extension Plan {
    var badgeColor: Color {
        switch self {
        case .free: .gray
        case .pro: .purple
        case .team: .blue
        }
    }
}
```

Name the pattern however you like (MV, MVVM): the layering is what matters. TCA (The Composable Architecture) is a valid heavier option for large teams once the fundamentals are solid.

Reference: [Value and Reference Types](https://www.swift.org/documentation/articles/value-and-reference-types.html)

### 5.5 Model Navigation as Data

**Impact: MEDIUM (deep links and state restoration for free)**

Drive `NavigationStack` with a path of `Hashable` route values and resolve destinations in one `navigationDestination(for:)`. Deep links, push notifications, and state restoration then become "append a route". Avoid `NavigationLink(destination:)` with eagerly built destination views scattered across screens.

**Incorrect (destinations wired inline; nothing can navigate programmatically):**

```swift
import SwiftUI

struct HomeView: View {
    let orders: [Order]

    var body: some View {
        NavigationStack {
            List(orders) { order in
                NavigationLink(destination: OrderDetailView(orderID: order.id)) {
                    Text(order.title)
                }
            }
        }
    }
}
```

**Correct (routes as values, a router model, one destination switch):**

```swift
import SwiftUI

enum Route: Hashable {
    case orderDetail(Order.ID)
    case settings
}

@MainActor
@Observable
final class Router {
    var path: [Route] = []

    func open(_ route: Route) { path.append(route) }
    func popToRoot() { path.removeAll() }
}

struct RootView: View {
    @State private var router = Router()
    let orders: [Order]

    var body: some View {
        NavigationStack(path: $router.path) {
            List(orders) { order in
                NavigationLink(value: Route.orderDetail(order.id)) { Text(order.title) }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .orderDetail(let id): OrderDetailView(orderID: id)
                case .settings: SettingsView()
                }
            }
        }
        .environment(router)
        .onOpenURL { url in
            if let id = Order.ID(deepLink: url) { router.open(.orderDetail(id)) } // your URL parser
        }
    }
}
```

Reference: [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)

### 5.6 Use @Observable Models, Not ObservableObject

**Impact: HIGH (views re-render only for properties they read)**

The Observation framework (`@Observable`, iOS 17 / macOS 14) replaces `ObservableObject`, `@Published`, `@StateObject`, and `@ObservedObject`. SwiftUI tracks exactly which properties `body` reads and re-renders only when those change, so there is no need for selectors or manual `objectWillChange`. Own a model with `@State`, pass it down as a plain property, share it with `.environment(_:)`, and create bindings with `@Bindable` or `$model.property`.

**Incorrect (Combine-era pattern; every @Published change re-renders every observer):**

```swift
import SwiftUI

final class SettingsModel: ObservableObject {
    @Published var username = ""
    @Published var notificationsEnabled = true
}

struct SettingsView: View {
    @StateObject private var model = SettingsModel()

    var body: some View {
        Form {
            TextField("Username", text: $model.username)
            Toggle("Notifications", isOn: $model.notificationsEnabled)
        }
    }
}
```

**Correct (Observation; fine-grained tracking):**

```swift
import SwiftUI

@MainActor
@Observable
final class SettingsModel {
    var username = ""
    var notificationsEnabled = true
}

struct SettingsView: View {
    @State private var model = SettingsModel()

    var body: some View {
        Form {
            TextField("Username", text: $model.username)
            NotificationsRow(model: model)
        }
    }
}

struct NotificationsRow: View {
    @Bindable var model: SettingsModel // binding to a model owned elsewhere

    var body: some View {
        Toggle("Notifications", isOn: $model.notificationsEnabled)
    }
}
```

React mapping: `@State` ≈ `useState`, `@Binding` ≈ passing a setter down, `@Environment` ≈ `useContext`, an `@Observable` class ≈ a store (Zustand/MobX).

Reference: [Migrating from the Observable Object protocol to the Observable macro](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro)

---

## 6. Repository Structure and Modularization

**Impact: MEDIUM-HIGH**

A thin app target plus a local Swift package with enforced module boundaries gives faster incremental builds, testable features, and an architecture the compiler enforces.

### 6.1 Expose the Minimal Public API per Module

**Impact: MEDIUM (encapsulation enforced by the compiler)**

Access levels: `private` (enclosing declaration), `fileprivate` (file), `internal` (module, the default), `package` (all modules in the same Swift package), `public` (other modules can use it), `open` (other modules can also subclass or override). Keep implementation details `internal`, use `package` for helpers shared across your own modules, and mark only the real entry points `public`.

**Incorrect (everything public "so it compiles"):**

```swift
public final class HTTPClient {
    public var baseURL: URL
    public var decoder = JSONDecoder()
    public func makeRequest(path: String) -> URLRequest { /* ... */ fatalError() }
    public func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R { fatalError() }
}
```

**Correct (only the contract is public):**

```swift
import Foundation

public final class HTTPClient: Sendable {
    private let baseURL: URL
    private let decoder = JSONDecoder()

    public init(baseURL: URL) {
        self.baseURL = baseURL
    }

    public func send<R: Decodable & Sendable>(_ endpoint: Endpoint<R>) async throws -> R {
        let request = try makeRequest(for: endpoint)
        let (data, _) = try await URLSession.shared.data(for: request)
        return try decoder.decode(R.self, from: data)
    }

    // Shared with other modules in this package (e.g. test support), hidden from the app.
    package func makeRequest<R>(for endpoint: Endpoint<R>) throws -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: endpoint.path))
        request.httpMethod = endpoint.method.rawValue
        return request
    }
}
```

Public structs do not get a public memberwise initializer; write `public init` explicitly. Public types must state `Sendable` explicitly because it is not inferred across module boundaries.

Reference: [Access Control](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/)

### 6.2 Features Depend on Domain Protocols, Not on Each Other

**Impact: HIGH (features build and test in isolation)**

A feature module should depend on `Domain` (and `DesignSystem`), never on `Networking`, `Persistence`, or another feature. Concrete implementations are wired together only in the app's composition root. Then a change to the HTTP client does not rebuild the UI, and a feature compiles and tests with fakes. Features talk to each other through navigation routes or domain protocols.

**Incorrect (feature reaches into the data layer and another feature):**

```swift
// Sources/FeatureCheckout/CheckoutModel.swift
import Networking   // concrete client
import FeatureCart  // another feature
import Observation

@MainActor
@Observable
final class CheckoutModel {
    let client = HTTPClient.live
    let cart = CartModel()
}
```

**Correct (feature sees only protocols from Domain):**

```swift
// Sources/Domain/CheckoutRepository.swift
public protocol CheckoutRepository: Sendable {
    func currentCart() async throws -> Cart
    func placeOrder(_ cart: Cart) async throws -> Order.ID
}

// Sources/FeatureCheckout/CheckoutModel.swift
import Domain
import Observation

@MainActor
@Observable
public final class CheckoutModel {
    private let repository: any CheckoutRepository
    public private(set) var cart: Cart?

    public init(repository: any CheckoutRepository) {
        self.repository = repository
    }

    public func load() async throws {
        cart = try await repository.currentCart()
    }
}

// App/MyApp.swift (composition root) is the only place that imports both:
// import Networking; import FeatureCheckout
// CheckoutModel(repository: RemoteCheckoutRepository(client: client))
```

Reference: [Swift Package Manager](https://www.swift.org/documentation/package-manager/)

### 6.3 Group Files by Feature, One Primary Type per File

**Impact: MEDIUM (related code changes together)**

Inside a module, group files by feature (screen), not by kind (`Views/`, `ViewModels/`). Name each file after its primary type; put extensions in `Type+Purpose.swift`. Inside a type, order members as stored properties, initializers, public methods, then private helpers, and put each protocol conformance in its own extension marked with `// MARK: -`.

**Incorrect (grouped by kind; one feature spread over four folders):**

```text
FeatureUsers/
├── Views/UserListView.swift
├── Views/UserDetailView.swift
├── ViewModels/UserListViewModel.swift
├── ViewModels/UserDetailViewModel.swift
└── Helpers/Extensions.swift      # 900 lines of unrelated extensions
```

**Correct (grouped by feature; small focused files):**

```text
FeatureUsers/
├── UserList/
│   ├── UserListView.swift
│   ├── UserListModel.swift
│   └── UserRow.swift
├── UserDetail/
│   ├── UserDetailView.swift
│   └── UserDetailModel.swift
├── User+Formatting.swift
└── FeatureUsers.swift            # public entry points
```

```swift
import Foundation

struct UserRowViewData: Identifiable, Sendable {
    let id: User.ID
    let name: String
    let email: String
}

// MARK: - CustomStringConvertible

extension UserRowViewData: CustomStringConvertible {
    var description: String { "\(name) <\(email)>" }
}
```

Reference: [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)

### 6.4 Keep Third-Party Dependencies Few and Justified

**Impact: MEDIUM (faster clean builds, fewer upgrade breakages)**

Unlike npm, the Swift standard library and Foundation cover most needs: networking (`URLSession`), JSON (`Codable`), dates and formatting (`FormatStyle`), regex (`Regex`), async streams, logging (`OSLog`), crypto (`CryptoKit`). Every package is compiled from source on clean builds and can break on Xcode upgrades. Add a dependency only for substantial, well-maintained functionality, pin it with `from:` (semantic versioning), and commit `Package.resolved`.

**Incorrect (packages for things the platform already provides):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppCore",
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire", from: "5.0.0"),   // URLSession is enough
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON", from: "5.0.0"), // Codable is enough
        .package(url: "https://github.com/some/date-helpers", branch: "main"),    // unpinned
    ],
    targets: [.target(name: "AppCore")]
)
```

**Correct (few, substantial, version-pinned dependencies):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppCore",
    dependencies: [
        .package(url: "https://github.com/groue/GRDB.swift", from: "7.0.0"),                    // SQL database
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"), // tests only
    ],
    targets: [
        .target(name: "Persistence", dependencies: [.product(name: "GRDB", package: "GRDB.swift")]),
        .testTarget(
            name: "DesignSystemTests",
            dependencies: [.product(name: "SnapshotTesting", package: "swift-snapshot-testing")]
        ),
    ]
)
```

Reference: [Swift Package Index](https://swiftpackageindex.com)

### 6.5 Use a Thin App Target and a Local Swift Package

**Impact: HIGH (faster incremental builds, enforced boundaries)**

A single app target means every change rebuilds a lot, everything can see everything, and tests require the app host. Keep the Xcode app target thin (entry point, composition root, assets, entitlements) and put the code in a local Swift package with one module per layer and feature. It is a monorepo of workspace packages, except that the compiler enforces the boundaries through `internal` and `public`.

**Incorrect (everything in one app target):**

```text
MyApp/
├── MyApp.xcodeproj
└── MyApp/
    ├── Views/          # 200 files
    ├── ViewModels/
    ├── Models/
    ├── Services/
    └── Helpers/
```

**Correct (thin app target plus a modular package):**

```text
MyApp/
├── MyApp.xcodeproj                # app target only
├── App/
│   ├── MyApp.swift                # @main, composition root
│   ├── Config/                    # Debug/Staging/Release .xcconfig
│   └── Resources/                 # Assets.xcassets, Localizable.xcstrings
├── Packages/
│   └── AppCore/
│       ├── Package.swift
│       ├── Sources/
│       │   ├── Domain/            # entities, rules, repository protocols
│       │   ├── Networking/        # HTTPClient, endpoints, DTOs
│       │   ├── Persistence/       # SwiftData/GRDB stores, migrations
│       │   ├── DesignSystem/      # colors, typography, components
│       │   ├── FeatureAuth/
│       │   ├── FeatureUsers/
│       │   └── TestSupport/       # fakes, fixtures
│       └── Tests/
│           ├── DomainTests/
│           ├── NetworkingTests/
│           └── FeatureUsersTests/
└── .swift-format
```

```swift
// swift-tools-version: 6.2
import PackageDescription

let concurrency: [SwiftSetting] = [
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("InferIsolatedConformances"),
]
let ui: [SwiftSetting] = concurrency + [.defaultIsolation(MainActor.self)]

let package = Package(
    name: "AppCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [
        .library(name: "FeatureUsers", targets: ["FeatureUsers"]),
        .library(name: "FeatureAuth", targets: ["FeatureAuth"]),
        .library(name: "Networking", targets: ["Networking"]),
        .library(name: "Persistence", targets: ["Persistence"]),
    ],
    targets: [
        .target(name: "Domain", swiftSettings: concurrency),
        .target(name: "Networking", dependencies: ["Domain"], swiftSettings: concurrency),
        .target(name: "Persistence", dependencies: ["Domain"], swiftSettings: concurrency),
        .target(name: "DesignSystem", swiftSettings: ui),
        .target(name: "FeatureUsers", dependencies: ["Domain", "DesignSystem"], swiftSettings: ui),
        .target(name: "FeatureAuth", dependencies: ["Domain", "DesignSystem"], swiftSettings: ui),
        .target(name: "TestSupport", dependencies: ["Domain"], swiftSettings: concurrency),
        .testTarget(name: "DomainTests", dependencies: ["Domain", "TestSupport"]),
        .testTarget(name: "NetworkingTests", dependencies: ["Networking", "TestSupport"]),
        .testTarget(name: "FeatureUsersTests", dependencies: ["FeatureUsers", "TestSupport"]),
    ],
    swiftLanguageModes: [.v6]
)
```

Add the package to the Xcode project (File → Add Package Dependencies → Add Local) and link the feature products to the app target. Commit `Package.resolved` like a lockfile.

Reference: [Swift Package Manager](https://www.swift.org/documentation/package-manager/)

---

## 7. Networking and API Integration

**Impact: MEDIUM-HIGH**

A single typed HTTP client with explicit endpoints, DTO mapping, and centralized auth makes API integration predictable and testable.

### 7.1 Centralize Requests in One HTTP Client with an Injected Transport

**Impact: HIGH (one place for auth, decoding, logging, errors)**

Build one `HTTPClient` that owns the base URL, JSON configuration, authorization, logging, and error mapping. Inject the transport behind a protocol so tests can stub responses without the network. Reuse a single `URLSession`; never create one per request. Map transport errors to one `NetworkError` type so callers never see `URLError`.

**Incorrect (each repository builds requests, decoders, and error handling itself):**

```swift
import Foundation

struct RemoteOrdersRepository {
    func orders(token: String) async throws -> [OrderDTO] {
        let session = URLSession(configuration: .default) // new session per call
        var request = URLRequest(url: URL(string: "https://api.example.com/v1/orders")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await session.data(for: request) // status code ignored
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([OrderDTO].self, from: data)
    }
}
```

**Correct (one client; transport and token provider injected):**

```swift
import Foundation
import OSLog

public protocol HTTPTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

public struct URLSessionHTTPTransport: HTTPTransport {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

public protocol AccessTokenProvider: Sendable {
    func validToken() async throws -> String
    func invalidateToken() async
}

public enum NetworkError: Error, Sendable, Equatable {
    case invalidRequest
    case invalidResponse
    case offline
    case timeout
    case cancelled
    case unauthorized
    case http(statusCode: Int, body: Data)
    case decoding(String)
    case transport(String)
}

public final class HTTPClient: Sendable {
    private let baseURL: URL
    private let transport: any HTTPTransport
    private let tokens: (any AccessTokenProvider)?
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let logger = Logger(subsystem: "com.example.app", category: "network")

    public init(
        baseURL: URL,
        transport: any HTTPTransport = URLSessionHTTPTransport(),
        tokens: (any AccessTokenProvider)? = nil
    ) {
        self.baseURL = baseURL
        self.transport = transport
        self.tokens = tokens

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    public func send<Response>(_ endpoint: Endpoint<Response>) async throws(NetworkError) -> Response {
        do {
            return try await perform(endpoint, allowAuthRetry: true)
        } catch let error as NetworkError {
            throw error
        } catch let error as URLError {
            switch error.code {
            case .notConnectedToInternet, .networkConnectionLost: throw .offline
            case .timedOut: throw .timeout
            case .cancelled: throw .cancelled
            default: throw .transport(error.localizedDescription)
            }
        } catch is CancellationError {
            throw .cancelled
        } catch {
            throw .transport(String(describing: error))
        }
    }

    private func perform<Response>(
        _ endpoint: Endpoint<Response>,
        allowAuthRetry: Bool
    ) async throws -> Response {
        let request = try await makeRequest(for: endpoint)
        let (data, response) = try await transport.data(for: request)

        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        logger.debug("\(endpoint.method.rawValue, privacy: .public) \(endpoint.path, privacy: .public) -> \(http.statusCode)")

        switch http.statusCode {
        case 200..<300:
            return try decode(Response.self, from: data)
        case 401 where endpoint.requiresAuth && allowAuthRetry:
            await tokens?.invalidateToken()
            return try await perform(endpoint, allowAuthRetry: false) // retry once with a fresh token
        case 401:
            throw NetworkError.unauthorized
        default:
            throw NetworkError.http(statusCode: http.statusCode, body: data)
        }
    }

    private func decode<Response: Decodable>(_ type: Response.Type, from data: Data) throws -> Response {
        if data.isEmpty, let empty = EmptyResponse() as? Response {
            return empty
        }
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            logger.error("Decoding \(String(describing: Response.self), privacy: .public) failed: \(String(describing: error), privacy: .public)")
            throw NetworkError.decoding(String(describing: error))
        }
    }

    private func makeRequest<Response>(for endpoint: Endpoint<Response>) async throws -> URLRequest {
        guard var components = URLComponents(
            url: baseURL.appending(path: endpoint.path),
            resolvingAgainstBaseURL: false
        ) else { throw NetworkError.invalidRequest }
        if !endpoint.query.isEmpty { components.queryItems = endpoint.query }
        guard let url = components.url else { throw NetworkError.invalidRequest }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if endpoint.requiresAuth, let tokens {
            let token = try await tokens.validToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
}
```

`.iso8601` does not accept fractional seconds; if your API sends them, use `.custom` with `Date.ISO8601FormatStyle(includingFractionalSeconds: true)`. For custom timeouts or caching, create one `URLSessionConfiguration` at startup and pass `URLSession(configuration:)` to the transport.

Reference: [Fetching website data into memory](https://developer.apple.com/documentation/foundation/fetching-website-data-into-memory)

### 7.2 Decode DTOs and Map Them to Domain Models at the Boundary

**Impact: MEDIUM-HIGH (API changes stay out of features)**

Decode JSON into DTO structs that mirror the wire format, then map them to domain models in the data layer. `Codable` validates the shape like a schema library (zod) would: a missing key or wrong type throws a precise `DecodingError`. Mapping is where you convert raw strings into enums, rename fields, and reject invalid data, so backend quirks never reach views.

**Incorrect (views consume the wire format directly):**

```swift
import SwiftUI

struct UserDTO: Decodable {
    let id: String
    let full_name: String
    let role: String // "admin" | "member" | ... unchecked
}

struct UserRow: View {
    let user: UserDTO
    var body: some View {
        Text(user.full_name)
            .foregroundStyle(user.role == "admin" ? .red : .primary) // string comparison in UI
    }
}
```

**Correct (DTO for decoding, domain model for the app, explicit mapping):**

```swift
import Foundation

struct UserDTO: Decodable, Sendable {
    let id: UUID
    let fullName: String   // decoded from "full_name" via .convertFromSnakeCase
    let email: String
    let role: String
    let createdAt: Date
}

enum Role: String, Sendable, Codable {
    case admin, member, guest
}

struct User: Identifiable, Hashable, Sendable {
    typealias ID = Tagged<User, UUID>
    let id: ID
    var name: String
    var email: String
    var role: Role
}

enum MappingError: Error, Equatable {
    case unknownRole(String)
}

extension User {
    init(dto: UserDTO) throws {
        guard let role = Role(rawValue: dto.role) else { throw MappingError.unknownRole(dto.role) }
        self.init(id: ID(dto.id), name: dto.fullName, email: dto.email, role: role)
    }
}

struct RemoteUserRepository: UserRepository {
    let client: HTTPClient

    func allUsers() async throws -> [User] {
        let page = try await client.send(UsersEndpoints.list(cursor: nil))
        return try page.items.map(User.init(dto:))
    }

    func user(id: User.ID) async throws -> User {
        try User(dto: await client.send(UsersEndpoints.user(id: id)))
    }
}
```

When a key cannot be derived by snake-case conversion, declare `enum CodingKeys: String, CodingKey` on the DTO. Never put `CodingKeys` or wire-format names on domain models.

Reference: [Encoding and Decoding Custom Types](https://developer.apple.com/documentation/foundation/encoding-and-decoding-custom-types)

### 7.3 Describe Endpoints as Typed Values

**Impact: HIGH (response types checked at compile time)**

Represent each API call as a value that carries its HTTP method, path, query, body, and response type: `Endpoint<Response>`. Group endpoints per resource in a caseless enum. The client then has one generic `send(_:)` method, call sites cannot decode the wrong type, and the endpoint list doubles as a typed API spec.

**Incorrect (stringly typed requests; response type chosen by each caller):**

```swift
import Foundation

func get(_ path: String) async throws -> Data {
    let url = URL(string: "https://api.example.com" + path)!
    return try await URLSession.shared.data(from: url).0
}

let data = try await get("/v1/users/\(id)")
let user = try JSONDecoder().decode(Order.self, from: data) // wrong type, fails at runtime
```

**Correct (endpoint values with a response type):**

```swift
import Foundation

public enum HTTPMethod: String, Sendable {
    case get = "GET", post = "POST", put = "PUT", patch = "PATCH", delete = "DELETE"
}

public struct Endpoint<Response: Decodable & Sendable>: Sendable {
    public var method: HTTPMethod
    public var path: String
    public var query: [URLQueryItem]
    public var body: (any Encodable & Sendable)?
    public var requiresAuth: Bool

    public init(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: (any Encodable & Sendable)? = nil,
        requiresAuth: Bool = true
    ) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
        self.requiresAuth = requiresAuth
    }
}

/// Use for endpoints that return no body (204 No Content).
public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}

enum UsersEndpoints {
    static func list(cursor: String?) -> Endpoint<Page<UserDTO>> {
        Endpoint(.get, "/v1/users", query: cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
    }

    static func user(id: User.ID) -> Endpoint<UserDTO> {
        Endpoint(.get, "/v1/users/\(id.rawValue.uuidString)")
    }

    static func update(id: User.ID, _ body: UpdateUserRequest) -> Endpoint<UserDTO> {
        Endpoint(.patch, "/v1/users/\(id.rawValue.uuidString)", body: body)
    }

    static func delete(id: User.ID) -> Endpoint<EmptyResponse> {
        Endpoint(.delete, "/v1/users/\(id.rawValue.uuidString)")
    }
}

struct Page<Item: Decodable & Sendable>: Decodable, Sendable {
    let items: [Item]
    let nextCursor: String?
}
```

Usage: `let dto = try await client.send(UsersEndpoints.user(id: id))`, where `dto` is statically `UserDTO`.

Reference: [URLSession](https://developer.apple.com/documentation/foundation/urlsession)

### 7.4 Generate Clients from OpenAPI for Large APIs

**Impact: MEDIUM (removes hand-written endpoint drift)**

When the backend publishes an OpenAPI document, generate the Swift client with Apple's Swift OpenAPI Generator (an SPM build plugin) instead of hand-writing dozens of endpoints and DTOs. It is the Swift counterpart of `openapi-typescript`: types and client methods are regenerated on every build, and every documented response is an enum case you must handle.

**Incorrect (hand-maintained copies of 80 backend endpoints):**

```swift
enum BillingEndpoints {
    static func invoices() -> Endpoint<[InvoiceDTO]> { Endpoint(.get, "/v1/invoices") }
    static func invoice(id: String) -> Endpoint<InvoiceDTO> { Endpoint(.get, "/v1/invoices/\(id)") }
    // ...78 more, silently drifting from the server
}
```

**Correct (generated types and client from `openapi.yaml`):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    dependencies: [
        .package(url: "https://github.com/apple/swift-openapi-generator", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "BillingAPI",
            dependencies: [
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
    ]
)
```

```yaml
# Sources/BillingAPI/openapi-generator-config.yaml  (openapi.yaml sits next to it)
generate:
  - types
  - client
accessModifier: internal
```

```swift
import Foundation
import OpenAPIRuntime
import OpenAPIURLSession

struct BillingRepository {
    private let client = Client(
        serverURL: URL(string: "https://api.example.com")!,
        transport: URLSessionTransport()
    )

    func invoice(id: String) async throws -> Components.Schemas.Invoice {
        let response = try await client.getInvoice(path: .init(id: id)) // operationId: getInvoice
        switch response {
        case .ok(let ok):
            return try ok.body.json
        case .notFound:
            throw BillingError.notFound
        case .undocumented(let statusCode, _):
            throw BillingError.unexpectedStatus(statusCode)
        }
    }
}
```

Generated method and type names come from `operationId` and schema names in your spec. Keep mapping generated types to domain models in the repository, as with hand-written DTOs.

Reference: [Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator)

### 7.5 Refresh Tokens Once and Retry 401s Once

**Impact: HIGH (no refresh storms, no infinite retry loops)**

When the access token expires, many concurrent requests get `401` at the same time. Each one refreshing on its own floods the auth server and races on the stored token. Keep the token in an actor that deduplicates in-flight refreshes (see `concurrency-actor-reentrancy`), invalidate it on `401`, and retry the request exactly once. Store refresh tokens in the Keychain, never in `UserDefaults`.

**Incorrect (every 401 triggers its own refresh; retries forever):**

```swift
func send<R>(_ endpoint: Endpoint<R>) async throws -> R {
    do {
        return try await perform(endpoint)
    } catch NetworkError.unauthorized {
        token = try await authAPI.refresh() // N concurrent refreshes, racing writes
        return try await send(endpoint)     // loops forever if refresh keeps failing
    }
}
```

**Correct (actor-backed provider; the client retries once):**

```swift
public actor AuthTokenStore: AccessTokenProvider {
    private var token: String?
    private var refreshTask: Task<String, any Error>?
    private let refresh: @Sendable () async throws -> String

    public init(refresh: @escaping @Sendable () async throws -> String) {
        self.refresh = refresh
    }

    public func validToken() async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let refresh = self.refresh
        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    public func invalidateToken() {
        token = nil
    }
}

// Composition root:
// let tokens = AuthTokenStore(refresh: { try await authAPI.refreshAccessToken(using: keychain) })
// let client = HTTPClient(baseURL: config.apiBaseURL, tokens: tokens)
```

`HTTPClient.perform` (see `networking-single-client`) handles `401` by calling `invalidateToken()` and retrying with `allowAuthRetry: false`; a second `401` surfaces as `NetworkError.unauthorized`, which the app handles by signing out.

Reference: [SE-0306 Actors](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md)

### 7.6 Retry Only Idempotent Requests with Backoff

**Impact: MEDIUM (resilience without duplicate side effects)**

Retry transient failures (timeouts, connection loss, 502/503/504) with exponential backoff, and only for idempotent operations (GET, PUT, DELETE) or requests that carry an idempotency key. Retrying a POST that already succeeded on the server charges a card twice. Do not retry client errors (4xx) or cancellation.

**Incorrect (blind immediate retries of any request):**

```swift
func createOrder(_ request: CreateOrderRequest) async throws -> Order {
    for _ in 0..<3 {
        if let order = try? await api.createOrder(request) { return order } // may create 3 orders
    }
    throw OrderError.failed
}
```

**Correct (retry helper with backoff and an explicit retry predicate):**

```swift
func withRetry<T>(
    maxAttempts: Int = 3,
    initialDelay: Duration = .milliseconds(500),
    isRetryable: (any Error) -> Bool,
    operation: () async throws -> T
) async throws -> T {
    var attempt = 1
    var delay = initialDelay
    while true {
        do {
            return try await operation()
        } catch let error where attempt < maxAttempts && isRetryable(error) {
            try await Task.sleep(for: delay) // throws CancellationError if cancelled
            delay *= 2
            attempt += 1
        }
    }
}

extension NetworkError {
    var isTransient: Bool {
        switch self {
        case .offline, .timeout: true
        case .http(let statusCode, _): [502, 503, 504].contains(statusCode)
        case .invalidRequest, .invalidResponse, .cancelled, .unauthorized, .decoding, .transport: false
        }
    }
}

// GET is idempotent: safe to retry.
func loadUser(id: User.ID, client: HTTPClient) async throws -> UserDTO {
    try await withRetry(isRetryable: { ($0 as? NetworkError)?.isTransient ?? false }) {
        try await client.send(UsersEndpoints.user(id: id))
    }
}
```

For non-idempotent writes, send an `Idempotency-Key` header with a UUID generated once per user action, and retry only if the backend supports it.

Reference: [Task.sleep(for:tolerance:clock:)](https://developer.apple.com/documentation/swift/task/sleep(for:tolerance:clock:))

---

## 8. Persistence and Local Data

**Impact: MEDIUM-HIGH**

Choosing the right store (UserDefaults, Keychain, SwiftData, GRDB) and respecting actor boundaries prevents data loss, leaked secrets, and threading crashes.

### 8.1 Choose the Right Store for Each Kind of Data

**Impact: HIGH (secrets protected, data in the right place)**

| Data | Store |
|---|---|
| Small preferences and flags | `UserDefaults` / `@AppStorage` |
| Secrets (tokens, passwords, keys) | Keychain |
| Files, caches, exports | `FileManager` (Application Support, Caches) |
| Relational app data, SwiftUI integration, iCloud sync | SwiftData |
| Full SQL control, complex queries, explicit migrations | GRDB (SQLite) |
| Your backend's database (PostgreSQL, etc.) | Never from the app: go through your API |

`UserDefaults` is an unencrypted plist readable from device backups. A mobile or desktop app must never hold database credentials for your backend: anything in the bundle can be extracted. The local database is a cache or offline store; the server stays the source of truth.

**Incorrect (secret in UserDefaults, backend database credentials shipped in the app):**

```swift
import Foundation

UserDefaults.standard.set(accessToken, forKey: "accessToken")

let databaseURL = "postgres://admin:s3cret@db.example.com:5432/prod" // extractable from the binary
```

**Correct (flags in UserDefaults, secrets in the Keychain, server data via the API):**

```swift
import SwiftUI

struct OnboardingGate: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        if hasSeenOnboarding { HomeView() } else { OnboardingView { hasSeenOnboarding = true } }
    }
}

func storeSession(token: String, keychain: Keychain) throws {
    try keychain.set(Data(token.utf8), for: "accessToken") // see persistence-keychain-secrets
}

func loadOrders(client: HTTPClient) async throws -> [OrderDTO] {
    try await client.send(OrdersEndpoints.list()) // the server owns the database
}
```

Reference: [SwiftData](https://developer.apple.com/documentation/swiftdata), [Keychain services](https://developer.apple.com/documentation/security/keychain-services)

### 8.2 Pass PersistentIdentifiers, Not Model Objects, Across Actors

**Impact: HIGH (prevents context-threading crashes)**

`@Model` instances are bound to the context that fetched them and are not `Sendable`. Sending one to another actor is a compile error in Swift 6 (and undefined behavior if forced). Send the `persistentModelID` (which is `Sendable`) or a value-type snapshot, and re-fetch inside the receiving actor.

**Incorrect (model object handed to a background actor):**

```swift
@MainActor
func archive(_ project: Project, store: ProjectSyncStore) async throws {
    try await store.archive(project) // Project is not Sendable
}
```

**Correct (identifier crosses the boundary; the actor re-fetches):**

```swift
import SwiftData

extension ProjectSyncStore {
    func rename(projectID: PersistentIdentifier, to newName: String) throws {
        guard let project = modelContext.model(for: projectID) as? Project else { return }
        project.name = newName
        try modelContext.save()
    }
}

@MainActor
func rename(_ project: Project, to name: String, store: ProjectSyncStore) async throws {
    try await store.rename(projectID: project.persistentModelID, to: name)
}
```

For domain logic that should not depend on SwiftData at all, map `@Model` objects to plain structs at the repository boundary.

Reference: [PersistentIdentifier](https://developer.apple.com/documentation/swiftdata/persistentidentifier)

### 8.3 Store Secrets in the Keychain

**Impact: HIGH (tokens encrypted at rest)**

The Keychain encrypts items with keys tied to the device and the user's passcode. Wrap the C-style `Security` API in a small `Sendable` type that the rest of the app uses. Choose the accessibility class deliberately: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` allows background refresh after the first unlock and keeps the item out of backups that move to other devices.

**Incorrect (secret in a plain file or UserDefaults):**

```swift
import Foundation

let url = URL.documentsDirectory.appending(path: "token.txt")
try refreshToken.write(to: url, atomically: true, encoding: .utf8)
```

**Correct (minimal Keychain wrapper):**

```swift
import Foundation
import Security

struct Keychain: Sendable {
    enum KeychainError: Error, Equatable {
        case unexpectedStatus(OSStatus)
    }

    let service: String

    func set(_ value: Data, for key: String) throws {
        let query = baseQuery(for: key)
        SecItemDelete(query as CFDictionary) // replace any existing item

        var attributes = query
        attributes[kSecValueData as String] = value
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.unexpectedStatus(status) }
    }

    func data(for key: String) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess: return result as? Data
        case errSecItemNotFound: return nil
        default: throw KeychainError.unexpectedStatus(status)
        }
    }

    func delete(_ key: String) throws {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
```

Keychain items survive app deletion on iOS; clear them on first launch after reinstall if your app requires a fresh sign-in.

Reference: [Keychain services](https://developer.apple.com/documentation/security/keychain-services)

### 8.4 Version Your Schema from the First Release

**Impact: MEDIUM-HIGH (upgrades without data loss)**

Users skip app versions, so every installed schema must migrate to the current one. Declare each shipped schema as a `VersionedSchema` and the transitions in a `SchemaMigrationPlan`. Use lightweight stages for additive changes (new optional or defaulted properties) and custom stages when data must be transformed. Unversioned models force you to retrofit versioning after users already have data on disk.

**Incorrect (model edited in place across releases):**

```swift
import SwiftData

@Model
final class Note {
    var title: String
    var body: String
    var isPinned: Bool // added in 2.0: existing stores may fail to open
    init(title: String, body: String, isPinned: Bool) {
        self.title = title
        self.body = body
        self.isPinned = isPinned
    }
}
```

**Correct (versioned schemas and a migration plan):**

```swift
import SwiftData

enum NotesSchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }
    static var models: [any PersistentModel.Type] { [Note.self] }

    @Model
    final class Note {
        var title: String
        var body: String
        init(title: String, body: String) {
            self.title = title
            self.body = body
        }
    }
}

enum NotesSchemaV2: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(2, 0, 0) }
    static var models: [any PersistentModel.Type] { [Note.self] }

    @Model
    final class Note {
        var title: String
        var body: String
        var isPinned: Bool = false
        init(title: String, body: String, isPinned: Bool = false) {
            self.title = title
            self.body = body
            self.isPinned = isPinned
        }
    }
}

enum NotesMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [NotesSchemaV1.self, NotesSchemaV2.self] }
    static var stages: [MigrationStage] {
        [.lightweight(fromVersion: NotesSchemaV1.self, toVersion: NotesSchemaV2.self)]
    }
}

typealias Note = NotesSchemaV2.Note

func makeContainer() throws -> ModelContainer {
    try ModelContainer(for: Note.self, migrationPlan: NotesMigrationPlan.self)
}
```

With GRDB, the same discipline is `DatabaseMigrator` with one named migration per change, never edited after release.

Reference: [SchemaMigrationPlan](https://developer.apple.com/documentation/swiftdata/schemamigrationplan)

### 8.5 Write SwiftData in the Background with @ModelActor

**Impact: HIGH (large syncs without blocking the UI)**

A `ModelContext` belongs to the actor that created it. The `@ModelActor` macro creates an actor with its own context on a background executor; use it to upsert API data in bulk. The UI reads through `@Query`, which updates automatically when the store changes. Keep `@Model` classes in a module whose default isolation is `nonisolated` (for example `Persistence`); under main-actor default isolation they are inferred `@MainActor` and cannot be used from a model actor.

**Incorrect (thousands of inserts on the main context during sync):**

```swift
import SwiftData

@MainActor
func sync(dtos: [ProjectDTO], context: ModelContext) throws {
    for dto in dtos {
        context.insert(Project(remoteID: dto.id, name: dto.name, createdAt: dto.createdAt)) // UI stalls
    }
    try context.save()
}
```

**Correct (model actor upserts; the UI observes via @Query):**

```swift
import Foundation
import SwiftData

@Model
final class Project {
    @Attribute(.unique) var remoteID: UUID
    var name: String
    var createdAt: Date

    init(remoteID: UUID, name: String, createdAt: Date) {
        self.remoteID = remoteID
        self.name = name
        self.createdAt = createdAt
    }
}

struct ProjectDTO: Decodable, Sendable {
    let id: UUID
    let name: String
    let createdAt: Date
}

@ModelActor
actor ProjectSyncStore {
    func upsert(_ dtos: [ProjectDTO]) throws {
        for dto in dtos {
            let remoteID = dto.id
            var descriptor = FetchDescriptor<Project>(
                predicate: #Predicate<Project> { $0.remoteID == remoteID }
            )
            descriptor.fetchLimit = 1

            if let existing = try modelContext.fetch(descriptor).first {
                existing.name = dto.name
            } else {
                modelContext.insert(Project(remoteID: dto.id, name: dto.name, createdAt: dto.createdAt))
            }
        }
        try modelContext.save()
    }
}

// Feature code (main actor):
// let store = ProjectSyncStore(modelContainer: container)
// try await store.upsert(try await client.send(ProjectsEndpoints.list()))
//
// View:
// @Query(sort: \Project.createdAt, order: .reverse) private var projects: [Project]
```

Reference: [ModelActor](https://developer.apple.com/documentation/swiftdata/modelactor)

---

## 9. Webhooks, Push, and Real-Time

**Impact: MEDIUM**

Apps cannot receive webhooks. Server-side ingestion, push notifications, and WebSocket streams must be wired together correctly to deliver real-time updates.

### 9.1 Expose WebSockets as AsyncThrowingStream with Reconnect and Resync

**Impact: MEDIUM (live updates that survive network changes)**

Wrap `URLSessionWebSocketTask` in a function returning `AsyncThrowingStream`, so features consume events with `for try await` and cancellation closes the socket. Sockets drop on network changes: reconnect with capped exponential backoff and re-sync state through REST after every (re)connect, because events sent while disconnected are lost. A stateless client does not need to be an actor.

**Incorrect (callback recursion, no cleanup, no reconnect, no resync):**

```swift
import Foundation

final class LiveClient {
    var onEvent: ((ServerEvent) -> Void)?
    private var socket: URLSessionWebSocketTask?

    func connect(url: URL) {
        socket = URLSession.shared.webSocketTask(with: url)
        socket?.resume()
        listen()
    }

    private func listen() {
        socket?.receive { result in
            if case .success(.string(let text)) = result,
               let event = try? JSONDecoder().decode(ServerEvent.self, from: Data(text.utf8)) {
                self.onEvent?(event) // strong self capture; stops forever on first failure
                self.listen()
            }
        }
    }
}
```

**Correct (stream with cleanup; consumer reconnects and resyncs):**

```swift
import Foundation
import Observation
import OSLog

struct ServerEvent: Decodable, Sendable {
    let orderID: Order.ID
    let status: OrderStatus
}

struct LiveUpdatesClient: Sendable {
    let url: URL
    var session: URLSession = .shared

    func events(token: String) -> AsyncThrowingStream<ServerEvent, any Error> {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let socket = session.webSocketTask(with: request)

        return AsyncThrowingStream { continuation in
            let receiveLoop = Task {
                do {
                    while !Task.isCancelled {
                        guard case .string(let text) = try await socket.receive() else { continue }
                        // Skip unknown event types for forward compatibility.
                        if let event = try? JSONDecoder().decode(ServerEvent.self, from: Data(text.utf8)) {
                            continuation.yield(event)
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in
                receiveLoop.cancel()
                socket.cancel(with: .goingAway, reason: nil)
            }
            socket.resume()
        }
    }
}

@MainActor
@Observable
final class LiveOrdersModel {
    private(set) var statuses: [Order.ID: OrderStatus] = [:]
    private let logger = Logger(subsystem: "com.example.app", category: "live")

    /// Run from `.task { }` so it is cancelled with the view.
    func observe(client: LiveUpdatesClient, token: String, resync: () async throws -> [Order.ID: OrderStatus]) async {
        var delay: Duration = .seconds(1)
        while !Task.isCancelled {
            do {
                statuses = try await resync() // catch up on anything missed while disconnected
                for try await event in client.events(token: token) {
                    statuses[event.orderID] = event.status
                    delay = .seconds(1)
                }
            } catch {
                logger.error("Live updates disconnected: \(error.localizedDescription, privacy: .public)")
            }
            do {
                try await Task.sleep(for: delay)
            } catch {
                return // cancelled
            }
            delay = min(delay * 2, .seconds(30))
        }
    }
}
```

For one-way server streams, Server-Sent Events over `URLSession.bytes(for:)` with `for try await line in bytes.lines` are simpler than WebSockets.

Reference: [URLSessionWebSocketTask](https://developer.apple.com/documentation/foundation/urlsessionwebsockettask)

### 9.2 Receive Webhooks on the Server, Then Notify the App

**Impact: HIGH (reliable real-time updates without polling)**

A webhook is an HTTP POST from a third party (Stripe, GitHub, Paddle) to a public server URL. An iOS or macOS app has no public address and may be suspended or offline, so it cannot receive webhooks. Ingest webhooks in your backend (Node, or Swift with Vapor), persist the result, then notify the app: APNs push when it may be in the background, WebSocket or SSE when it is open. The app always re-fetches authoritative state from your API.

```text
Provider ──webhook──▶ Backend ──▶ database (source of truth)
                         ├──▶ APNs push ──▶ app (alert or silent refresh)
                         └──▶ WebSocket/SSE ──▶ app (while open)
App ──GET /v1/orders/{id}──▶ Backend
```

**Incorrect (app polls the provider on a timer with an embedded secret key):**

```swift
import Foundation

@MainActor
final class PaymentStatusModel {
    var status = "pending"
    private var timer: Timer?

    func start(paymentID: String) {
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in
            Task { @MainActor in
                // Secret API key shipped in the app; battery drain; misses updates while suspended.
                self.status = try await StripeDirect(secretKey: "sk_live_...").status(of: paymentID)
            }
        }
    }
}
```

**Correct (server ingests the webhook; app reacts to push or socket and re-fetches):**

```swift
import Foundation
import Observation

@MainActor
@Observable
final class PaymentStatusModel {
    private(set) var status: PaymentStatus = .pending
    private let repository: any PaymentsRepository

    init(repository: any PaymentsRepository) {
        self.repository = repository
    }

    /// Called when a push notification or socket event says this payment changed.
    func paymentDidChange(id: Payment.ID) async {
        do {
            status = try await repository.payment(id: id).status // the API is the source of truth
        } catch {
            // Keep the last known state; the next event or screen refresh will retry.
        }
    }
}

protocol PaymentsRepository: Sendable {
    func payment(id: Payment.ID) async throws -> Payment
}
```

Reference: [Setting up a remote notification server](https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server)

### 9.3 Register for Push and Handle Delegate Callbacks Off the Main Actor

**Impact: MEDIUM (correct token registration and notification routing)**

Request authorization, register with APNs, and send the hex-encoded device token to your backend, which stores it per user and sends pushes with an APNs auth key (.p8). In a SwiftUI app, hook into the app delegate with `@UIApplicationDelegateAdaptor` (`@NSApplicationDelegateAdaptor` on macOS). `UNUserNotificationCenterDelegate` callbacks are not guaranteed to arrive on the main actor: implement them `nonisolated`, extract `Sendable` values, then hop to the main actor.

**Incorrect (token never sent; main-actor state mutated from a nonisolated callback):**

```swift
import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var lastOrderID: String?

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print(deviceToken) // prints "32 bytes"; backend never learns the token
    }
}
```

**Correct (coordinator with nonisolated delegate methods; token forwarded):**

```swift
import SwiftUI
import UserNotifications

@MainActor
final class PushCoordinator: NSObject, UNUserNotificationCenterDelegate {
    var onDeviceToken: ((String) -> Void)?
    var onOpenOrder: ((String) -> Void)?

    func requestAuthorization() async throws -> Bool {
        try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
    }

    func didRegister(deviceToken: Data) {
        onDeviceToken?(deviceToken.map { String(format: "%02x", $0) }.joined())
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        guard let orderID = response.notification.request.content.userInfo["order_id"] as? String else { return }
        await openOrder(orderID)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    private func openOrder(_ orderID: String) {
        onOpenOrder?(orderID)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    let push = PushCoordinator()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = push
        application.registerForRemoteNotifications()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        push.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        // Simulator without APNs support, missing entitlement, or no network: log it.
    }
}

@main
struct ShopApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var router = Router()
    private let devices = DevicesAPI.live // your backend client: POST /v1/devices

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(router)
                .task {
                    appDelegate.push.onOpenOrder = { rawID in
                        guard let uuid = UUID(uuidString: rawID) else { return }
                        router.open(.orderDetail(Order.ID(uuid)))
                    }
                    appDelegate.push.onDeviceToken = { token in
                        Task {
                            do {
                                try await devices.register(token: token)
                            } catch {
                                // Registration is retried on the next launch.
                            }
                        }
                    }
                    do {
                        _ = try await appDelegate.push.requestAuthorization()
                    } catch {
                        // Authorization request failed; the app keeps working without push.
                    }
                }
        }
    }
}
```

Enable the Push Notifications capability (and Background Modes → Remote notifications for silent pushes). Silent pushes (`content-available: 1`) are throttled by the system: treat them as hints, not guaranteed delivery.

Reference: [Registering your app with APNs](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)

### 9.4 Verify Webhook Signatures and Process Events Idempotently

**Impact: HIGH (blocks forged events and double processing)**

When the backend is written in Swift (Vapor), apply the same rules as in Node: verify the HMAC signature over the raw body with a constant-time comparison, reject stale timestamps to stop replays, deduplicate by event ID because providers retry, acknowledge quickly with 2xx, and do heavy work in a background job.

**Incorrect (trusts any POST, decodes before verifying, processes retries twice):**

```swift
import Vapor

func routes(_ app: Application) throws {
    app.post("webhooks", "payments") { req async throws -> HTTPStatus in
        let event = try req.content.decode(PaymentEvent.self) // anyone can forge this
        try await fulfill(event)                               // slow; provider retries; double fulfillment
        return .ok
    }
}
```

**Correct (Vapor 4: signature, timestamp, idempotency, async job):**

```swift
import Crypto               // swift-crypto (CryptoKit API on Linux)
import Foundation
import NIOFoundationCompat  // Data(buffer:)
import Vapor

protocol WebhookEventLog: Sendable {
    /// Returns false if the event was already recorded (e.g. INSERT ... ON CONFLICT DO NOTHING).
    func markProcessedIfNew(_ eventID: String) async throws -> Bool
}

protocol JobQueue: Sendable {
    func enqueue(_ event: PaymentEvent) async throws
}

struct PaymentEvent: Codable, Sendable {
    let id: String
    let type: String
    let paymentID: String
}

struct PaymentWebhookController: RouteCollection {
    let signingSecret: SymmetricKey
    let eventLog: any WebhookEventLog
    let jobs: any JobQueue
    let tolerance: TimeInterval = 300

    func boot(routes: any RoutesBuilder) throws {
        routes.on(.POST, "webhooks", "payments", body: .collect(maxSize: "1mb"), use: receive)
    }

    @Sendable
    func receive(req: Request) async throws -> HTTPStatus {
        guard
            let timestampHeader = req.headers.first(name: "X-Webhook-Timestamp"),
            let timestamp = TimeInterval(timestampHeader),
            let signatureHex = req.headers.first(name: "X-Webhook-Signature"),
            let signature = Data(hexString: signatureHex),
            let buffer = req.body.data
        else { throw Abort(.badRequest) }

        guard abs(Date().timeIntervalSince1970 - timestamp) <= tolerance else {
            throw Abort(.unauthorized, reason: "Stale timestamp")
        }

        let body = Data(buffer: buffer)
        let signedPayload = Data("\(timestampHeader).".utf8) + body
        guard HMAC<SHA256>.isValidAuthenticationCode(signature, authenticating: signedPayload, using: signingSecret) else {
            throw Abort(.unauthorized, reason: "Invalid signature")
        }

        let event = try JSONDecoder().decode(PaymentEvent.self, from: body)
        guard try await eventLog.markProcessedIfNew(event.id) else { return .ok } // retry of a handled event

        try await jobs.enqueue(event) // fulfillment, push notifications, etc.
        return .ok
    }
}

extension Data {
    init?(hexString: String) {
        guard hexString.count.isMultiple(of: 2) else { return nil }
        var bytes: [UInt8] = []
        bytes.reserveCapacity(hexString.count / 2)
        var index = hexString.startIndex
        while index < hexString.endIndex {
            let next = hexString.index(index, offsetBy: 2)
            guard let byte = UInt8(hexString[index..<next], radix: 16) else { return nil }
            bytes.append(byte)
            index = next
        }
        self.init(bytes)
    }
}
```

Header names and the signed-payload format differ per provider (Stripe signs `timestamp.body` in a `Stripe-Signature` header); follow the provider's documentation exactly. Vapor 5 is in beta at the time of writing and changes routing APIs; check the version you use.

Reference: [Vapor Docs](https://docs.vapor.codes), [swift-crypto](https://github.com/apple/swift-crypto)

---

## 10. API Design and Code Style

**Impact: MEDIUM**

Following the Swift API Design Guidelines makes call sites read like prose and makes code look native to every Swift developer who reads it.

### 10.1 Design Call Sites That Read Like Prose

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

### 10.2 Design Small Protocols with Default Implementations

**Impact: MEDIUM (easy conformance, easy fakes)**

Swift protocols differ from TypeScript interfaces: conformance is explicit (nominal), protocols can carry default implementations in extensions, and you can conform existing types retroactively. Keep each protocol focused on one capability so fakes are trivial, and put shared behavior in protocol extensions instead of base classes.

**Incorrect (one fat protocol; every fake implements twenty methods):**

```swift
protocol BackendService {
    func login(email: String, password: String) async throws -> Session
    func logout() async throws
    func users() async throws -> [User]
    func orders() async throws -> [Order]
    func uploadAvatar(_ data: Data) async throws
    // ...15 more
}
```

**Correct (capability-sized protocols, shared behavior in an extension):**

```swift
import Foundation

protocol OrdersRepository: Sendable {
    func orders(page: Int) async throws -> [Order]
}

extension OrdersRepository {
    /// Default implementation available to every conforming type.
    func allOrders(maxPages: Int = 10) async throws -> [Order] {
        var result: [Order] = []
        for page in 0..<maxPages {
            let batch = try await orders(page: page)
            if batch.isEmpty { break }
            result += batch
        }
        return result
    }
}

struct InMemoryOrdersRepository: OrdersRepository {
    let pages: [[Order]]
    func orders(page: Int) async throws -> [Order] {
        page < pages.count ? pages[page] : []
    }
}
```

Reference: [Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)

### 10.3 Follow Swift Naming Conventions

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

### 10.4 Keep Logic in Small Pure Functions, Effects at the Edges

**Impact: MEDIUM (logic testable without mocks)**

Put business rules in small synchronous functions over value types (input → output). Keep side effects (network, disk, clock, UI) in thin async layers that call those functions. Mark a function `async` only if it actually awaits, `throws` only if it can fail, and make methods that do not use `self` `static`. Inject the current date instead of calling `Date()` inside logic.

**Incorrect (rules, I/O, and clock tangled in one async method):**

```swift
import Foundation

@MainActor
final class SubscriptionModel {
    var banner = ""
    let api: SubscriptionAPI

    init(api: SubscriptionAPI) { self.api = api }

    func refresh() async throws {
        let sub = try await api.subscription()
        if sub.plan == "pro" && sub.renewsAt.timeIntervalSince(Date()) < 3 * 86_400 && !sub.autoRenew {
            banner = "Your Pro plan expires soon"
        } else {
            banner = ""
        }
    }
}
```

**Correct (pure rule plus thin effectful wrapper):**

```swift
import Foundation
import Observation

enum RenewalBanner {
    static func message(for subscription: Subscription, now: Date) -> String? {
        guard subscription.plan == .pro, !subscription.autoRenew else { return nil }
        let threeDays: TimeInterval = 3 * 86_400
        return subscription.renewsAt.timeIntervalSince(now) < threeDays ? "Your Pro plan expires soon" : nil
    }
}

@MainActor
@Observable
final class SubscriptionModel {
    private(set) var banner: String?
    private let api: any SubscriptionAPI
    private let now: @Sendable () -> Date

    init(api: any SubscriptionAPI, now: @escaping @Sendable () -> Date = { Date() }) {
        self.api = api
        self.now = now
    }

    func refresh() async throws {
        let subscription = try await api.subscription()
        banner = RenewalBanner.message(for: subscription, now: now())
    }
}
```

`RenewalBanner.message(for:now:)` can be tested with plain values in microseconds, no fakes required.

Reference: [Functions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/)

---

## 11. Testing

**Impact: MEDIUM**

Swift Testing, protocol-based fakes, and sanitizers catch regressions and concurrency bugs before release.

### 11.1 Run Tests with Thread Sanitizer in CI

**Impact: MEDIUM (catches races the compiler cannot see)**

Swift 6 checking covers Swift code, but races can still come from `@unchecked Sendable` types, C/Objective-C libraries, and legacy GCD code. Thread Sanitizer detects them at runtime. Run the test suite with TSan in CI (it slows tests, so a separate job is fine), and Address Sanitizer periodically for memory errors in unsafe code.

**Incorrect (tests run only locally, without sanitizers):**

```bash
# "Works on my machine": no CI, no sanitizers
swift test
```

**Correct (CI runs package tests and app tests with Thread Sanitizer):**

```yaml
# .github/workflows/ci.yml (excerpt)
jobs:
  test:
    runs-on: macos-26
    steps:
      - uses: actions/checkout@v4
      - name: Package tests with Thread Sanitizer
        working-directory: Packages/AppCore
        run: swift test --sanitize=thread
      - name: App tests
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 17' \
            -enableThreadSanitizer YES
```

Adjust the runner image and simulator name to what your CI provider offers (`xcrun simctl list devices available`). In Xcode, enable sanitizers per test plan under Diagnostics.

Reference: [Diagnosing memory, thread, and crash issues early](https://developer.apple.com/documentation/xcode/diagnosing-memory-thread-and-crash-issues-early)

### 11.2 Test Through Protocol Fakes, Not the Network

**Impact: MEDIUM (fast, deterministic tests)**

Tests that hit real servers are slow, flaky, and depend on data you do not control. Because the HTTP client takes an `HTTPTransport` and features take repository protocols, tests substitute fakes: a stub transport to test request building, decoding, and error mapping; in-memory repositories to test feature models; an in-memory `ModelContainer` to test SwiftData code.

**Incorrect (unit test calls the staging API):**

```swift
import Testing
@testable import Networking

@Test func decodesUser() async throws {
    let client = HTTPClient(baseURL: URL(string: "https://staging.example.com")!)
    let user = try await client.send(UsersEndpoints.user(id: User.ID(UUID()))) // network, flaky, random ID
    #expect(!user.fullName.isEmpty)
}
```

**Correct (stub transport and in-memory store):**

```swift
import Foundation
import SwiftData
import Testing
@testable import Networking
@testable import Persistence

struct StubTransport: HTTPTransport {
    enum Outcome: Sendable {
        case response(statusCode: Int, body: String)
        case failure(URLError)
    }

    let outcome: Outcome

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        switch outcome {
        case .response(let statusCode, let body):
            // Force-unwraps are acceptable in test helpers with constant inputs.
            let response = HTTPURLResponse(url: request.url!, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
            return (Data(body.utf8), response)
        case .failure(let error):
            throw error
        }
    }
}

@Test func decodesSnakeCaseUser() async throws {
    let json = """
    {"id": "6F9619FF-8B86-D011-B42D-00C04FC964FF", "full_name": "Ada Lovelace",
     "email": "ada@example.com", "role": "admin", "created_at": "2026-01-01T00:00:00Z"}
    """
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .response(statusCode: 200, body: json))
    )

    let dto = try await client.send(UsersEndpoints.user(id: User.ID(UUID())))

    #expect(dto.fullName == "Ada Lovelace")
}

@Test func mapsOfflineError() async {
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .failure(URLError(.notConnectedToInternet)))
    )

    await #expect(throws: NetworkError.offline) {
        try await client.send(UsersEndpoints.user(id: User.ID(UUID())))
    }
}

@Test func upsertUpdatesExistingProject() async throws {
    let container = try ModelContainer(
        for: Project.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: true)
    )
    let store = ProjectSyncStore(modelContainer: container)
    let id = UUID()

    try await store.upsert([ProjectDTO(id: id, name: "Old", createdAt: .now)])
    try await store.upsert([ProjectDTO(id: id, name: "New", createdAt: .now)])

    let projects = try ModelContext(container).fetch(FetchDescriptor<Project>())
    #expect(projects.map(\.name) == ["New"])
}
```

Reference: [Swift Testing: Expectations and confirmations](https://developer.apple.com/documentation/testing/expectations)

### 11.3 Write Tests with Swift Testing

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

---

## 12. Tooling, Configuration, and Observability

**Impact: LOW-MEDIUM**

Per-environment configuration, structured logging, and automated formatting keep a production codebase operable and consistent.

### 12.1 Automate Formatting and Linting in CI

**Impact: LOW-MEDIUM (consistent style without review comments)**

Pick one formatter and run it automatically: `swift format`, which ships with the Swift 6 toolchain, or SwiftFormat. Add SwiftLint for rules a formatter does not cover (force unwraps, force tries). Fail CI on violations and treat warnings as errors in CI builds so concurrency warnings do not pile up.

**Incorrect (style enforced by review comments; warnings ignored):**

```bash
# No formatter config, no lint step; 300 warnings in the build log
xcodebuild build -scheme MyApp
```

**Correct (checked-in config, lint in CI, warnings as errors):**

```json
{
  "version": 1,
  "indentation": { "spaces": 4 },
  "lineLength": 120,
  "rules": {
    "AlwaysUseLowerCamelCase": true,
    "NeverForceUnwrap": true,
    "NeverUseForceTry": true,
    "OrderedImports": true
  }
}
```

```bash
# Save the JSON above as .swift-format at the repository root, then in CI:
swift format lint --strict --recursive Packages/AppCore/Sources Packages/AppCore/Tests App
swiftlint lint --strict
xcodebuild build -scheme MyApp SWIFT_TREAT_WARNINGS_AS_ERRORS=YES
```

Run `swift format --in-place --recursive .` locally or in a pre-commit hook so CI rarely fails on formatting.

Reference: [swift-format](https://github.com/swiftlang/swift-format)

### 12.2 Configure Environments with xcconfig, Never Ship Secrets

**Impact: MEDIUM (per-environment builds without code changes)**

There is no `.env` at runtime: everything in the app bundle ships to users and can be extracted. Define per-configuration values (API base URL, bundle ID suffix) in `.xcconfig` files, surface them through `Info.plist`, and read them once into a typed config. Secrets for paid third-party APIs belong on your backend, not in the app. Use `#if DEBUG` only for developer tooling.

**Incorrect (environment switched by editing code; secret key in the binary):**

```swift
enum Config {
    static let baseURL = "https://staging-api.example.com" // edited by hand before release
    static let openAIKey = "sk-..."                          // extractable from the app bundle
}
```

**Correct (xcconfig → Info.plist → typed config):**

```text
// App/Config/Staging.xcconfig
API_BASE_URL = https:/$()/staging-api.example.com
PRODUCT_BUNDLE_IDENTIFIER = com.example.app.staging
```

```xml
<!-- Info.plist -->
<key>API_BASE_URL</key>
<string>$(API_BASE_URL)</string>
```

```swift
import Foundation

struct AppConfig: Sendable {
    let apiBaseURL: URL

    static let current: AppConfig = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("API_BASE_URL is missing from Info.plist") // misconfigured build: fail fast
        }
        return AppConfig(apiBaseURL: url)
    }()
}
```

`$()` in the xcconfig value is required because `//` starts a comment in xcconfig files. Create one Xcode configuration (Debug, Staging, Release) per environment and assign each its xcconfig.

Reference: [Adding a build configuration file to your project](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)

### 12.3 Log with Logger, Not print

**Impact: LOW-MEDIUM (structured, private-by-default, near-zero cost)**

`print` output is unstructured, always evaluated, and invisible in production diagnostics. `Logger` from `OSLog` (unified logging) has levels, subsystems and categories, is filterable in Console.app and Instruments, costs almost nothing when a level is disabled, and redacts dynamic values in release builds unless marked `.public`. Mark personal data `.private` explicitly.

**Incorrect (print with personal data):**

```swift
func signIn(email: String, password: String) async throws {
    print("Signing in \(email) with \(password)") // leaks credentials to the device log
}
```

**Correct (categorized loggers, explicit privacy):**

```swift
import OSLog

extension Logger {
    private static let subsystem = "com.example.app"
    static let auth = Logger(subsystem: subsystem, category: "auth")
    static let network = Logger(subsystem: subsystem, category: "network")
    static let sync = Logger(subsystem: subsystem, category: "sync")
}

func signIn(email: String, password: String) async throws {
    Logger.auth.info("Sign-in started for \(email, privacy: .private(mask: .hash))")
    // never log the password
}

func logSyncResult(count: Int, duration: Duration) {
    Logger.sync.notice("Synced \(count) items in \(duration.formatted(), privacy: .public)")
}
```

For crashes and field metrics use Xcode Organizer and MetricKit; add a third-party crash reporter only if you need more.

Reference: [Logger](https://developer.apple.com/documentation/os/logger)

---

## References

1. [https://docs.swift.org/swift-book/documentation/the-swift-programming-language/](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/)
2. [https://www.swift.org/documentation/api-design-guidelines/](https://www.swift.org/documentation/api-design-guidelines/)
3. [https://www.swift.org/migration/documentation/migrationguide](https://www.swift.org/migration/documentation/migrationguide)
4. [https://developer.apple.com/swift/get-started/](https://developer.apple.com/swift/get-started/)
5. [https://developer.apple.com/documentation/swiftui](https://developer.apple.com/documentation/swiftui)
6. [https://developer.apple.com/documentation/swiftdata](https://developer.apple.com/documentation/swiftdata)
7. [https://developer.apple.com/documentation/testing](https://developer.apple.com/documentation/testing)
8. [https://github.com/swiftlang/swift-evolution](https://github.com/swiftlang/swift-evolution)
9. [https://www.skills.sh/emilkowalski/skills/write-swift](https://www.skills.sh/emilkowalski/skills/write-swift)
