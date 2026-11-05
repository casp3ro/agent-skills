---
title: Use a Thin App Target and a Local Swift Package
impact: HIGH
impactDescription: faster incremental builds, enforced boundaries
tags: modules, spm, package, repository-structure
---

## Use a Thin App Target and a Local Swift Package

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
