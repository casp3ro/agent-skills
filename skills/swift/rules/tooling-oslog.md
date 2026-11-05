---
title: Log with Logger, Not print
impact: LOW-MEDIUM
impactDescription: structured, private-by-default, near-zero cost
tags: tooling, logging, oslog, privacy, observability
---

## Log with Logger, Not print

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
