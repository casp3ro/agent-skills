// Rules: concurrency-async-let, concurrency-task-group, concurrency-actor-shared-state,
// concurrency-actor-reentrancy, concurrency-no-unsafe-escapes, concurrency-sendable-values,
// concurrency-cancellation, concurrency-bridge-callbacks, realtime-websocket-stream

import Foundation
import Observation
import OSLog
import Synchronization

// MARK: - async let

struct Profile: Sendable { let name: String }
struct Stats: Sendable { let orders: Int }
struct Alert: Sendable { let message: String }

struct Dashboard: Sendable {
    let profile: Profile
    let stats: Stats
    let alerts: [Alert]
}

protocol DashboardAPI: Sendable {
    func profile() async throws -> Profile
    func stats() async throws -> Stats
    func alerts() async throws -> [Alert]
}

func loadDashboard(api: some DashboardAPI) async throws -> Dashboard {
    async let profile = api.profile()
    async let stats = api.stats()
    async let alerts = api.alerts()
    return try await Dashboard(profile: profile, stats: stats, alerts: alerts)
}

// MARK: - Task group with a concurrency limit

protocol UsersAPI: Sendable {
    func user(id: User.ID) async throws -> User
}

func fetchUsers(
    ids: [User.ID],
    api: some UsersAPI,
    maxConcurrent: Int = 4
) async throws -> [User.ID: User] {
    try await withThrowingTaskGroup(of: (User.ID, User).self) { group in
        var result: [User.ID: User] = [:]
        var iterator = ids.makeIterator()

        for _ in 0..<maxConcurrent {
            guard let id = iterator.next() else { break }
            group.addTask { (id, try await api.user(id: id)) }
        }
        while let finished = try await group.next() {
            let (id, user) = finished
            result[id] = user
            if let nextID = iterator.next() {
                group.addTask { (nextID, try await api.user(id: nextID)) }
            }
        }
        return result
    }
}

// MARK: - Actor for shared state

actor ImageCache {
    private var storage: [URL: Data] = [:]
    private let limit: Int

    init(limit: Int = 200) {
        self.limit = limit
    }

    func data(for url: URL) -> Data? {
        storage[url]
    }

    func insert(_ data: Data, for url: URL) {
        if storage.count >= limit, let firstKey = storage.keys.first {
            storage[firstKey] = nil
        }
        storage[url] = data
    }

    nonisolated var debugName: String { "ImageCache" }
}

func cachedImage(_ url: URL, cache: ImageCache) async -> Data? {
    await cache.data(for: url)
}

// MARK: - Reentrancy-safe deduplication

actor TokenStore {
    private var token: String?
    private var refreshTask: Task<String, any Error>?

    func validToken(
        refresh: @escaping @Sendable () async throws -> String
    ) async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    func invalidate() {
        token = nil
    }
}

// MARK: - Sendable alternatives to unsafe escapes

struct SessionSnapshot: Sendable {
    let userID: String?
    let isRefreshing: Bool
}

actor SessionStore {
    private(set) var snapshot = SessionSnapshot(userID: nil, isRefreshing: false)
    func update(_ newValue: SessionSnapshot) { snapshot = newValue }
}

final class Counter: Sendable {
    private let value = Mutex(0)

    func increment() -> Int {
        value.withLock { count in
            count += 1
            return count
        }
    }
}

// MARK: - Value types across boundaries

struct DraftPayload: Sendable, Codable {
    let title: String
    let body: String
}

nonisolated struct Uploader {
    @concurrent
    func upload(_ draft: DraftPayload) async throws -> Data {
        try JSONEncoder().encode(draft)
    }
}

// MARK: - Cancellation

protocol ChunkUploader: Sendable {
    func upload(_ chunk: Data) async throws
}

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

// MARK: - Bridging callback APIs

struct Config: Sendable { let flags: [String: Bool] }
enum ConfigError: Error { case emptyResponse }

/// Stand-in for a callback-based SDK.
final class LegacyConfigClient: Sendable {
    func fetch(_ completion: @escaping @Sendable (Config?, (any Error)?) -> Void) {
        completion(Config(flags: ["newOnboarding": true]), nil)
    }
}

func loadConfig(client: LegacyConfigClient) async throws -> Config {
    try await withCheckedThrowingContinuation { continuation in
        client.fetch { config, error in
            if let config {
                continuation.resume(returning: config)
            } else {
                continuation.resume(throwing: error ?? ConfigError.emptyResponse)
            }
        }
    }
}

struct Price: Sendable { let value: Decimal }

/// Stand-in for an event-based SDK. Its handler registry is protected by a Mutex.
final class LegacyPriceFeed: Sendable {
    private let handlers = Mutex<[UUID: @Sendable (Price) -> Void]>([:])

    func subscribe(_ handler: @escaping @Sendable (Price) -> Void) -> UUID {
        let token = UUID()
        handlers.withLock { $0[token] = handler }
        return token
    }

    func unsubscribe(_ token: UUID) {
        _ = handlers.withLock { $0.removeValue(forKey: token) }
    }

    func publish(_ price: Price) {
        let current = handlers.withLock { Array($0.values) }
        for handler in current { handler(price) }
    }
}

func priceUpdates(feed: LegacyPriceFeed) -> AsyncStream<Price> {
    AsyncStream { continuation in
        let token = feed.subscribe { price in
            continuation.yield(price)
        }
        continuation.onTermination = { _ in
            feed.unsubscribe(token)
        }
    }
}

// MARK: - WebSocket stream

struct ServerEvent: Decodable, Sendable {
    let orderID: Order.ID
    let status: OrderStatus
}

struct LiveUpdatesClient: Sendable {
    let url: URL
    var session: URLSession = .shared

    func events(token: String) -> AsyncThrowingStream<ServerEvent, any Error> {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let socket = session.webSocketTask(with: request)

        return AsyncThrowingStream { continuation in
            let receiveLoop = Task {
                do {
                    while !Task.isCancelled {
                        guard case .string(let text) = try await socket.receive() else { continue }
                        if let event = try? JSONDecoder().decode(ServerEvent.self, from: Data(text.utf8)) {
                            continuation.yield(event)
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in
                receiveLoop.cancel()
                socket.cancel(with: .goingAway, reason: nil)
            }
            socket.resume()
        }
    }
}

@MainActor
@Observable
final class LiveOrdersModel {
    private(set) var statuses: [Order.ID: OrderStatus] = [:]
    private let logger = Logger(subsystem: "com.example.app", category: "live")

    func observe(
        client: LiveUpdatesClient,
        token: String,
        resync: () async throws -> [Order.ID: OrderStatus]
    ) async {
        var delay: Duration = .seconds(1)
        while !Task.isCancelled {
            do {
                statuses = try await resync()
                for try await event in client.events(token: token) {
                    statuses[event.orderID] = event.status
                    delay = .seconds(1)
                }
            } catch {
                logger.error("Live updates disconnected: \(error.localizedDescription, privacy: .public)")
            }
            do {
                try await Task.sleep(for: delay)
            } catch {
                return
            }
            delay = min(delay * 2, .seconds(30))
        }
    }
}
