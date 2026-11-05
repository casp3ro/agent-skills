---
title: Write SwiftData in the Background with @ModelActor
impact: HIGH
impactDescription: large syncs without blocking the UI
tags: persistence, swiftdata, modelactor, sync, offline-first
---

## Write SwiftData in the Background with @ModelActor

**Impact: HIGH (large syncs without blocking the UI)**

A `ModelContext` belongs to the actor that created it. The `@ModelActor` macro creates an actor with its own context on a background executor; use it to upsert API data in bulk. The UI reads through `@Query`, which updates automatically when the store changes. Keep `@Model` classes in a module whose default isolation is `nonisolated` (for example `Persistence`); under main-actor default isolation they are inferred `@MainActor` and cannot be used from a model actor.

**Incorrect (thousands of inserts on the main context during sync):**

```swift
import SwiftData

@MainActor
func sync(dtos: [ProjectDTO], context: ModelContext) throws {
    for dto in dtos {
        context.insert(Project(remoteID: dto.id, name: dto.name, createdAt: dto.createdAt)) // UI stalls
    }
    try context.save()
}
```

**Correct (model actor upserts; the UI observes via @Query):**

```swift
import Foundation
import SwiftData

@Model
final class Project {
    @Attribute(.unique) var remoteID: UUID
    var name: String
    var createdAt: Date

    init(remoteID: UUID, name: String, createdAt: Date) {
        self.remoteID = remoteID
        self.name = name
        self.createdAt = createdAt
    }
}

struct ProjectDTO: Decodable, Sendable {
    let id: UUID
    let name: String
    let createdAt: Date
}

@ModelActor
actor ProjectSyncStore {
    func upsert(_ dtos: [ProjectDTO]) throws {
        for dto in dtos {
            let remoteID = dto.id
            var descriptor = FetchDescriptor<Project>(
                predicate: #Predicate<Project> { $0.remoteID == remoteID }
            )
            descriptor.fetchLimit = 1

            if let existing = try modelContext.fetch(descriptor).first {
                existing.name = dto.name
            } else {
                modelContext.insert(Project(remoteID: dto.id, name: dto.name, createdAt: dto.createdAt))
            }
        }
        try modelContext.save()
    }
}

// Feature code (main actor):
// let store = ProjectSyncStore(modelContainer: container)
// try await store.upsert(try await client.send(ProjectsEndpoints.list()))
//
// View:
// @Query(sort: \Project.createdAt, order: .reverse) private var projects: [Project]
```

Reference: [ModelActor](https://developer.apple.com/documentation/swiftdata/modelactor)
