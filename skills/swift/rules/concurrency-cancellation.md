---
title: Support Cooperative Cancellation
impact: HIGH
impactDescription: stops wasted work when the user leaves
tags: concurrency, cancellation, task, errors
---

## Support Cooperative Cancellation

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
