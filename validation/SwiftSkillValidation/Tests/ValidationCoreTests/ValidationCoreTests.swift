import Foundation
import SwiftData
import Synchronization
import Testing
@testable import ValidationCore

// MARK: - Test doubles (testing-fakes-over-network)

struct StubTransport: HTTPTransport {
    enum Outcome: Sendable {
        case response(statusCode: Int, body: String)
        case failure(URLError)
    }

    let outcome: Outcome

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        switch outcome {
        case .response(let statusCode, let body):
            let response = HTTPURLResponse(url: request.url!, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
            return (Data(body.utf8), response)
        case .failure(let error):
            throw error
        }
    }
}

final class SequencedTransport: HTTPTransport {
    private let outcomes: Mutex<[StubTransport.Outcome]>
    private let requests = Mutex<[URLRequest]>([])

    init(_ outcomes: [StubTransport.Outcome]) {
        self.outcomes = Mutex(outcomes)
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        requests.withLock { $0.append(request) }
        let next = outcomes.withLock { $0.removeFirst() }
        return try await StubTransport(outcome: next).data(for: request)
    }

    var authorizationHeaders: [String?] {
        requests.withLock { list in list.map { $0.value(forHTTPHeaderField: "Authorization") } }
    }
}

let userJSON = """
{"id": "6F9619FF-8B86-D011-B42D-00C04FC964FF", "full_name": "Ada Lovelace",
 "email": "ada@example.com", "role": "admin", "created_at": "2026-01-01T00:00:00Z"}
"""

// MARK: - Domain

@Test func taggedIDEncodesAsSingleValue() throws {
    let uuid = try #require(UUID(uuidString: "6F9619FF-8B86-D011-B42D-00C04FC964FF"))
    let data = try JSONEncoder().encode(User.ID(uuid))

    #expect(String(decoding: data, as: UTF8.self) == "\"6F9619FF-8B86-D011-B42D-00C04FC964FF\"")
    #expect(try JSONDecoder().decode(User.ID.self, from: data) == User.ID(uuid))
}

@Test func renewalBannerOnlyForExpiringManualProPlans() {
    let now = Date(timeIntervalSince1970: 1_000_000)
    let soon = now.addingTimeInterval(86_400)

    #expect(RenewalBanner.message(for: Subscription(plan: .pro, renewsAt: soon, autoRenew: false), now: now) != nil)
    #expect(RenewalBanner.message(for: Subscription(plan: .pro, renewsAt: soon, autoRenew: true), now: now) == nil)
    #expect(RenewalBanner.message(for: Subscription(plan: .free, renewsAt: soon, autoRenew: false), now: now) == nil)
}

@Test func defaultProtocolImplementationPaginates() async throws {
    let order = Order(id: Order.ID(UUID()), title: "A", total: 10)
    let repository = InMemoryOrdersRepository(pages: [[order, order], [order], []])

    let orders = try await repository.allOrders()
    #expect(orders.count == 3)
}

// MARK: - Networking

@Test func decodesSnakeCaseUser() async throws {
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .response(statusCode: 200, body: userJSON))
    )

    let dto = try await client.send(UsersEndpoints.user(id: User.ID(UUID())))

    #expect(dto.fullName == "Ada Lovelace")
    #expect(try User(dto: dto).role == .admin)
}

@Test func mapsOfflineError() async {
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .failure(URLError(.notConnectedToInternet)))
    )

    await #expect(throws: NetworkError.offline) {
        try await client.send(UsersEndpoints.user(id: User.ID(UUID())))
    }
}

@Test func emptyBodyDecodesAsEmptyResponse() async throws {
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: StubTransport(outcome: .response(statusCode: 204, body: ""))
    )

    _ = try await client.send(UsersEndpoints.delete(id: User.ID(UUID())))
}

@Test func retriesUnauthorizedOnceWithFreshToken() async throws {
    let transport = SequencedTransport([
        .response(statusCode: 401, body: ""),
        .response(statusCode: 200, body: userJSON),
    ])
    let refreshes = Counter()
    let tokens = AuthTokenStore(refresh: { "token-\(refreshes.increment())" })
    let client = HTTPClient(baseURL: URL(string: "https://api.test")!, transport: transport, tokens: tokens)

    let dto = try await client.send(UsersEndpoints.user(id: User.ID(UUID())))

    #expect(dto.email == "ada@example.com")
    #expect(transport.authorizationHeaders == ["Bearer token-1", "Bearer token-2"])
}

@Test func secondUnauthorizedSurfacesError() async {
    let transport = SequencedTransport([
        .response(statusCode: 401, body: ""),
        .response(statusCode: 401, body: ""),
    ])
    let client = HTTPClient(
        baseURL: URL(string: "https://api.test")!,
        transport: transport,
        tokens: AuthTokenStore(refresh: { "token" })
    )

    await #expect(throws: NetworkError.unauthorized) {
        try await client.send(UsersEndpoints.user(id: User.ID(UUID())))
    }
}

@Test func concurrentCallersShareOneRefresh() async throws {
    let refreshes = Counter()
    let store = AuthTokenStore(refresh: {
        try await Task.sleep(for: .milliseconds(50))
        return "token-\(refreshes.increment())"
    })

    let tokens = try await withThrowingTaskGroup(of: String.self) { group in
        for _ in 0..<10 {
            group.addTask { try await store.validToken() }
        }
        var result: [String] = []
        for try await token in group { result.append(token) }
        return result
    }

    #expect(Set(tokens) == ["token-1"])
}

@Test func retriesTransientErrorsThenSucceeds() async throws {
    let attempts = Counter()
    let value = try await withRetry(
        initialDelay: .milliseconds(1),
        isRetryable: { ($0 as? NetworkError)?.isTransient ?? false }
    ) { () async throws -> String in
        if attempts.increment() < 3 { throw NetworkError.timeout }
        return "ok"
    }

    #expect(value == "ok")
}

@Test func doesNotRetryNonTransientErrors() async {
    let attempts = Counter()
    await #expect(throws: NetworkError.unauthorized) {
        try await withRetry(
            initialDelay: .milliseconds(1),
            isRetryable: { ($0 as? NetworkError)?.isTransient ?? false }
        ) { () async throws -> String in
            _ = attempts.increment()
            throw NetworkError.unauthorized
        }
    }
    #expect(attempts.increment() == 2) // exactly one attempt happened before this call
}

@Test func paymentErrorsAreTyped() async throws {
    let client = PaymentsClient(transport: StubTransport(outcome: .response(statusCode: 402, body: "")))
    let request = URLRequest(url: try #require(URL(string: "https://api.test/pay")))

    await #expect(throws: PaymentError.cardDeclined(reason: "insufficient_funds")) {
        try await client.pay(request)
    }

    let model = await CheckoutModel()
    await model.pay(client: client, request: request)
    let message = await model.message
    #expect(message == "Your card was declined.")
}

// MARK: - Concurrency

actor InFlightTracker {
    private(set) var current = 0
    private(set) var maximum = 0

    func begin() {
        current += 1
        maximum = max(maximum, current)
    }

    func end() {
        current -= 1
    }
}

struct SlowUsersAPI: UsersAPI {
    let tracker: InFlightTracker

    func user(id: User.ID) async throws -> User {
        await tracker.begin()
        try await Task.sleep(for: .milliseconds(20))
        await tracker.end()
        return User(id: id, name: "User", email: "user@example.com", role: .member)
    }
}

@Test func taskGroupRespectsConcurrencyLimit() async throws {
    let tracker = InFlightTracker()
    let ids = (0..<10).map { _ in User.ID(UUID()) }

    let users = try await fetchUsers(ids: ids, api: SlowUsersAPI(tracker: tracker), maxConcurrent: 3)

    #expect(users.count == 10)
    let maximum = await tracker.maximum
    #expect(maximum <= 3)
}

struct FakeDashboardAPI: DashboardAPI {
    func profile() async throws -> Profile { Profile(name: "Ada") }
    func stats() async throws -> Stats { Stats(orders: 3) }
    func alerts() async throws -> [Alert] { [] }
}

@Test func asyncLetLoadsDashboard() async throws {
    let dashboard = try await loadDashboard(api: FakeDashboardAPI())
    #expect(dashboard.profile.name == "Ada")
    #expect(dashboard.stats.orders == 3)
}

@Test func continuationBridgesCallbackAPI() async throws {
    let config = try await loadConfig(client: LegacyConfigClient())
    #expect(config.flags["newOnboarding"] == true)
}

@Test func asyncStreamBridgesEventAPI() async {
    let feed = LegacyPriceFeed()
    var iterator = priceUpdates(feed: feed).makeAsyncIterator()

    feed.publish(Price(value: 42))

    let first = await iterator.next()
    #expect(first?.value == 42)
}

@Test func actorCacheStoresValues() async throws {
    let cache = ImageCache(limit: 1)
    let first = try #require(URL(string: "https://example.com/a.png"))
    let second = try #require(URL(string: "https://example.com/b.png"))

    await cache.insert(Data([1]), for: first)
    await cache.insert(Data([2]), for: second)

    let secondData = await cache.data(for: second)
    let firstData = await cache.data(for: first)
    #expect(secondData == Data([2]))
    #expect(firstData == nil)
}

// MARK: - Persistence

@Test func upsertUpdatesExistingProject() async throws {
    let container = try ModelContainer(
        for: Project.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: true)
    )
    let store = ProjectSyncStore(modelContainer: container)
    let id = UUID()

    try await store.upsert([ProjectDTO(id: id, name: "Old", createdAt: .now)])
    try await store.upsert([ProjectDTO(id: id, name: "New", createdAt: .now)])

    let projects = try ModelContext(container).fetch(FetchDescriptor<Project>())
    #expect(projects.map(\.name) == ["New"])
}

@Test func versionedSchemaContainerOpens() throws {
    let container = try makeNotesContainer(inMemory: true)
    let context = ModelContext(container)
    context.insert(Note(title: "Hello", body: "World"))
    try context.save()

    #expect(try context.fetch(FetchDescriptor<Note>()).first?.isPinned == false)
}
