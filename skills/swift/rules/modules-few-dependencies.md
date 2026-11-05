---
title: Keep Third-Party Dependencies Few and Justified
impact: MEDIUM
impactDescription: faster clean builds, fewer upgrade breakages
tags: modules, dependencies, spm, maintenance
---

## Keep Third-Party Dependencies Few and Justified

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
