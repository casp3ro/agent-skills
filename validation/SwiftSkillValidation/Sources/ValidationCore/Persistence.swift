// Rules: persistence-keychain-secrets, persistence-model-actor, persistence-no-models-across-actors,
// persistence-versioned-schema

import Foundation
import Security
import SwiftData

// MARK: - Keychain

struct Keychain: Sendable {
    enum KeychainError: Error, Equatable {
        case unexpectedStatus(OSStatus)
    }

    let service: String

    func set(_ value: Data, for key: String) throws {
        let query = baseQuery(for: key)
        SecItemDelete(query as CFDictionary)

        var attributes = query
        attributes[kSecValueData as String] = value
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.unexpectedStatus(status) }
    }

    func data(for key: String) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess: return result as? Data
        case errSecItemNotFound: return nil
        default: throw KeychainError.unexpectedStatus(status)
        }
    }

    func delete(_ key: String) throws {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}

// MARK: - SwiftData background writes

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

extension ProjectSyncStore {
    func rename(projectID: PersistentIdentifier, to newName: String) throws {
        guard let project = modelContext.model(for: projectID) as? Project else { return }
        project.name = newName
        try modelContext.save()
    }
}

// MARK: - Versioned schema

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

func makeNotesContainer(inMemory: Bool = false) throws -> ModelContainer {
    try ModelContainer(
        for: Note.self,
        migrationPlan: NotesMigrationPlan.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: inMemory)
    )
}
