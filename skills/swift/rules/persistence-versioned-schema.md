---
title: Version Your Schema from the First Release
impact: MEDIUM-HIGH
impactDescription: upgrades without data loss
tags: persistence, swiftdata, migrations, schema
---

## Version Your Schema from the First Release

**Impact: MEDIUM-HIGH (upgrades without data loss)**

Users skip app versions, so every installed schema must migrate to the current one. Declare each shipped schema as a `VersionedSchema` and the transitions in a `SchemaMigrationPlan`. Use lightweight stages for additive changes (new optional or defaulted properties) and custom stages when data must be transformed. Unversioned models force you to retrofit versioning after users already have data on disk.

**Incorrect (model edited in place across releases):**

```swift
import SwiftData

@Model
final class Note {
    var title: String
    var body: String
    var isPinned: Bool // added in 2.0: existing stores may fail to open
    init(title: String, body: String, isPinned: Bool) {
        self.title = title
        self.body = body
        self.isPinned = isPinned
    }
}
```

**Correct (versioned schemas and a migration plan):**

```swift
import SwiftData

enum NotesSchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }
    static var models: [any PersistentModel.Type] { [Note.self] }

    @Model
    final class Note {
        var title: String
        var body: String
        init(title: String, body: String) {
            self.title = title
            self.body = body
        }
    }
}

enum NotesSchemaV2: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(2, 0, 0) }
    static var models: [any PersistentModel.Type] { [Note.self] }

    @Model
    final class Note {
        var title: String
        var body: String
        var isPinned: Bool = false
        init(title: String, body: String, isPinned: Bool = false) {
            self.title = title
            self.body = body
            self.isPinned = isPinned
        }
    }
}

enum NotesMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [NotesSchemaV1.self, NotesSchemaV2.self] }
    static var stages: [MigrationStage] {
        [.lightweight(fromVersion: NotesSchemaV1.self, toVersion: NotesSchemaV2.self)]
    }
}

typealias Note = NotesSchemaV2.Note

func makeContainer() throws -> ModelContainer {
    try ModelContainer(for: Note.self, migrationPlan: NotesMigrationPlan.self)
}
```

With GRDB, the same discipline is `DatabaseMigrator` with one named migration per change, never edited after release.

Reference: [SchemaMigrationPlan](https://developer.apple.com/documentation/swiftdata/schemamigrationplan)
