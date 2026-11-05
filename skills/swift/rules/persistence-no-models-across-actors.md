---
title: Pass PersistentIdentifiers, Not Model Objects, Across Actors
impact: HIGH
impactDescription: prevents context-threading crashes
tags: persistence, swiftdata, sendable, actors
---

## Pass PersistentIdentifiers, Not Model Objects, Across Actors

**Impact: HIGH (prevents context-threading crashes)**

`@Model` instances are bound to the context that fetched them and are not `Sendable`. Sending one to another actor is a compile error in Swift 6 (and undefined behavior if forced). Send the `persistentModelID` (which is `Sendable`) or a value-type snapshot, and re-fetch inside the receiving actor.

**Incorrect (model object handed to a background actor):**

```swift
@MainActor
func archive(_ project: Project, store: ProjectSyncStore) async throws {
    try await store.archive(project) // Project is not Sendable
}
```

**Correct (identifier crosses the boundary; the actor re-fetches):**

```swift
import SwiftData

extension ProjectSyncStore {
    func rename(projectID: PersistentIdentifier, to newName: String) throws {
        guard let project = modelContext.model(for: projectID) as? Project else { return }
        project.name = newName
        try modelContext.save()
    }
}

@MainActor
func rename(_ project: Project, to name: String, store: ProjectSyncStore) async throws {
    try await store.rename(projectID: project.persistentModelID, to: name)
}
```

For domain logic that should not depend on SwiftData at all, map `@Model` objects to plain structs at the repository boundary.

Reference: [PersistentIdentifier](https://developer.apple.com/documentation/swiftdata/persistentidentifier)
