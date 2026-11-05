---
title: Tie Task Lifetime to the UI with .task
impact: HIGH
impactDescription: automatic cancellation, no leaked work
tags: concurrency, swiftui, task, lifetime
---

## Tie Task Lifetime to the UI with .task

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
