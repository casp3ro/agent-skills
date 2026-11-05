// swift-tools-version: 6.2
// Compile-checks the self-contained "Correct" examples from skills/swift/rules with a real toolchain.
// Run on macOS with Xcode 26 or later:  swift build && swift test
import PackageDescription

let approachableConcurrency: [SwiftSetting] = [
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("InferIsolatedConformances"),
]

let package = Package(
    name: "SwiftSkillValidation",
    platforms: [.macOS(.v15), .iOS(.v18)],
    products: [
        .library(name: "ValidationCore", targets: ["ValidationCore"]),
        .library(name: "ValidationUI", targets: ["ValidationUI"]),
    ],
    targets: [
        // Domain, networking, concurrency, persistence: default `nonisolated` isolation.
        .target(name: "ValidationCore", swiftSettings: approachableConcurrency),
        // SwiftUI layer: main-actor default isolation, as in an Xcode app target.
        .target(
            name: "ValidationUI",
            dependencies: ["ValidationCore"],
            swiftSettings: approachableConcurrency + [.defaultIsolation(MainActor.self)]
        ),
        .testTarget(
            name: "ValidationCoreTests",
            dependencies: ["ValidationCore"],
            swiftSettings: approachableConcurrency
        ),
        .testTarget(
            name: "ValidationUITests",
            dependencies: ["ValidationUI", "ValidationCore"],
            swiftSettings: approachableConcurrency
        ),
    ],
    swiftLanguageModes: [.v6]
)
