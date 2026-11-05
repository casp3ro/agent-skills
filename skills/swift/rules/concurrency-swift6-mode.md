---
title: Enable Swift 6 Mode and Approachable Concurrency
impact: CRITICAL
impactDescription: data races become compile errors
tags: concurrency, swift6, build-settings, spm
---

## Enable Swift 6 Mode and Approachable Concurrency

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
