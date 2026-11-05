---
title: Do Not Swallow Errors with try?
impact: MEDIUM
impactDescription: failures stay visible and debuggable
tags: safety, errors, try, logging
---

## Do Not Swallow Errors with try?

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
