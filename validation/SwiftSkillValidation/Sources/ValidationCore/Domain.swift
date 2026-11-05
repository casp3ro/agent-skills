// Rules: modeling-tagged-ids, modeling-enum-state, modeling-struct-by-default, safety-meaningful-optionals,
// architecture-layered-dependencies, api-pure-functions, api-small-protocols

import Foundation

// MARK: - Strongly typed identifiers

public struct Tagged<Tag, RawValue: Hashable & Sendable>: Hashable, Sendable {
    public let rawValue: RawValue

    public init(_ rawValue: RawValue) {
        self.rawValue = rawValue
    }
}

extension Tagged: Codable where RawValue: Codable {
    public init(from decoder: any Decoder) throws {
        rawValue = try decoder.singleValueContainer().decode(RawValue.self)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

// MARK: - Entities

public enum Role: String, Codable, Sendable, CaseIterable {
    case admin, member, guest
}

public struct User: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<User, UUID>

    public let id: ID
    public var name: String
    public var email: String
    public var role: Role

    public init(id: ID, name: String, email: String, role: Role) {
        self.id = id
        self.name = name
        self.email = email
        self.role = role
    }

    public static func sample(name: String, role: Role = .member) -> User {
        User(id: ID(UUID()), name: name, email: "\(name.lowercased())@example.com", role: role)
    }
}

public struct Order: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Order, UUID>

    public let id: ID
    public var title: String
    public var total: Decimal

    public init(id: ID, title: String, total: Decimal) {
        self.id = id
        self.title = title
        self.total = total
    }
}

public enum OrderStatus: String, Codable, Sendable {
    case pending, paid, shipped, cancelled
}

public struct Invoice: Identifiable, Sendable {
    public let id: UUID
    public let number: String
    public let issuedAt: Date
    public var paidAt: Date?

    public var isPaid: Bool { paidAt != nil }
}

// MARK: - State

public enum LoadState<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(any Error)
}

public enum PaymentStatus {
    case pending, paid, failed, refunded
}

public func badgeColor(for status: PaymentStatus) -> String {
    switch status {
    case .pending: "gray"
    case .paid: "green"
    case .failed: "red"
    case .refunded: "blue"
    }
}

// MARK: - Repositories

public protocol UserRepository: Sendable {
    func allUsers() async throws -> [User]
    func user(id: User.ID) async throws -> User
}

public enum RepositoryError: Error, Equatable {
    case notFound
}

public struct InMemoryUserRepository: UserRepository {
    public let users: [User]

    public init(users: [User]) {
        self.users = users
    }

    public func allUsers() async throws -> [User] {
        users
    }

    public func user(id: User.ID) async throws -> User {
        guard let user = users.first(where: { $0.id == id }) else { throw RepositoryError.notFound }
        return user
    }
}

public struct FailingUserRepository: UserRepository {
    public let error: any Error & Sendable

    public init(error: any Error & Sendable) {
        self.error = error
    }

    public func allUsers() async throws -> [User] { throw error }
    public func user(id: User.ID) async throws -> User { throw error }
}

protocol OrdersRepository: Sendable {
    func orders(page: Int) async throws -> [Order]
}

extension OrdersRepository {
    func allOrders(maxPages: Int = 10) async throws -> [Order] {
        var result: [Order] = []
        for page in 0..<maxPages {
            let batch = try await orders(page: page)
            if batch.isEmpty { break }
            result += batch
        }
        return result
    }
}

struct InMemoryOrdersRepository: OrdersRepository {
    let pages: [[Order]]

    func orders(page: Int) async throws -> [Order] {
        page < pages.count ? pages[page] : []
    }
}

// MARK: - Pure business rules

public enum Plan: String, Codable, Sendable {
    case free, pro, team
}

public struct Subscription: Sendable, Equatable {
    public let plan: Plan
    public let renewsAt: Date
    public let autoRenew: Bool

    public init(plan: Plan, renewsAt: Date, autoRenew: Bool) {
        self.plan = plan
        self.renewsAt = renewsAt
        self.autoRenew = autoRenew
    }

    public func isExpiring(within days: Int, now: Date = .now) -> Bool {
        renewsAt.timeIntervalSince(now) < Double(days) * 86_400
    }
}

public enum RenewalBanner {
    public static func message(for subscription: Subscription, now: Date) -> String? {
        guard subscription.plan == .pro, !subscription.autoRenew else { return nil }
        let threeDays: TimeInterval = 3 * 86_400
        return subscription.renewsAt.timeIntervalSince(now) < threeDays ? "Your Pro plan expires soon" : nil
    }
}

// MARK: - Shapes (modeling-some-over-any)

protocol Shape {
    var area: Double { get }
}

struct Circle: Shape {
    let radius: Double
    var area: Double { .pi * radius * radius }
}

struct Square: Shape {
    let side: Double
    var area: Double { side * side }
}

func totalArea<S: Shape>(of shapes: [S]) -> Double {
    shapes.reduce(0) { $0 + $1.area }
}

func render(_ shape: some Shape) -> String {
    "Area: \(shape.area)"
}

func mixedArea() -> Double {
    let mixed: [any Shape] = [Circle(radius: 1), Square(side: 2)]
    return mixed.reduce(0) { $0 + $1.area }
}
