---
title: Automate Formatting and Linting in CI
impact: LOW-MEDIUM
impactDescription: consistent style without review comments
tags: tooling, swift-format, swiftlint, ci, warnings
---

## Automate Formatting and Linting in CI

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
