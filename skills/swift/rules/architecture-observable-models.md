---
title: Use @Observable Models, Not ObservableObject
impact: HIGH
impactDescription: views re-render only for properties they read
tags: architecture, swiftui, observable, state
---

## Use @Observable Models, Not ObservableObject

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
