// Rules: networking-typed-endpoints, networking-single-client, networking-dto-mapping,
// networking-auth-refresh, networking-retry-idempotent, safety-domain-errors

import Foundation
import OSLog

// MARK: - Endpoints

public enum HTTPMethod: String, Sendable {
    case get = "GET", post = "POST", put = "PUT", patch = "PATCH", delete = "DELETE"
}

public struct Endpoint<Response: Decodable & Sendable>: Sendable {
    public var method: HTTPMethod
    public var path: String
    public var query: [URLQueryItem]
    public var body: (any Encodable & Sendable)?
    public var requiresAuth: Bool

    public init(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: (any Encodable & Sendable)? = nil,
        requiresAuth: Bool = true
    ) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
        self.requiresAuth = requiresAuth
    }
}

public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}

struct Page<Item: Decodable & Sendable>: Decodable, Sendable {
    let items: [Item]
    let nextCursor: String?
}

struct UserDTO: Decodable, Sendable {
    let id: UUID
    let fullName: String
    let email: String
    let role: String
    let createdAt: Date
}

struct UpdateUserRequest: Encodable, Sendable {
    let fullName: String
    let email: String

    init(_ user: User) {
        fullName = user.name
        email = user.email
    }
}

enum UsersEndpoints {
    static func list(cursor: String?) -> Endpoint<Page<UserDTO>> {
        Endpoint(.get, "/v1/users", query: cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
    }

    static func user(id: User.ID) -> Endpoint<UserDTO> {
        Endpoint(.get, "/v1/users/\(id.rawValue.uuidString)")
    }

    static func update(id: User.ID, _ body: UpdateUserRequest) -> Endpoint<UserDTO> {
        Endpoint(.patch, "/v1/users/\(id.rawValue.uuidString)", body: body)
    }

    static func delete(id: User.ID) -> Endpoint<EmptyResponse> {
        Endpoint(.delete, "/v1/users/\(id.rawValue.uuidString)")
    }
}

// MARK: - Transport and auth

public protocol HTTPTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

public struct URLSessionHTTPTransport: HTTPTransport {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

public protocol AccessTokenProvider: Sendable {
    func validToken() async throws -> String
    func invalidateToken() async
}

public actor AuthTokenStore: AccessTokenProvider {
    private var token: String?
    private var refreshTask: Task<String, any Error>?
    private let refresh: @Sendable () async throws -> String

    public init(refresh: @escaping @Sendable () async throws -> String) {
        self.refresh = refresh
    }

    public func validToken() async throws -> String {
        if let token { return token }
        if let refreshTask { return try await refreshTask.value }

        let refresh = self.refresh
        let task = Task { try await refresh() }
        refreshTask = task
        defer { refreshTask = nil }

        let newToken = try await task.value
        token = newToken
        return newToken
    }

    public func invalidateToken() {
        token = nil
    }
}

// MARK: - Client

public enum NetworkError: Error, Sendable, Equatable {
    case invalidRequest
    case invalidResponse
    case offline
    case timeout
    case cancelled
    case unauthorized
    case http(statusCode: Int, body: Data)
    case decoding(String)
    case transport(String)
}

public final class HTTPClient: Sendable {
    private let baseURL: URL
    private let transport: any HTTPTransport
    private let tokens: (any AccessTokenProvider)?
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let logger = Logger(subsystem: "com.example.app", category: "network")

    public init(
        baseURL: URL,
        transport: any HTTPTransport = URLSessionHTTPTransport(),
        tokens: (any AccessTokenProvider)? = nil
    ) {
        self.baseURL = baseURL
        self.transport = transport
        self.tokens = tokens

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    public func send<Response>(_ endpoint: Endpoint<Response>) async throws(NetworkError) -> Response {
        do {
            return try await perform(endpoint, allowAuthRetry: true)
        } catch let error as NetworkError {
            throw error
        } catch let error as URLError {
            switch error.code {
            case .notConnectedToInternet, .networkConnectionLost: throw .offline
            case .timedOut: throw .timeout
            case .cancelled: throw .cancelled
            default: throw .transport(error.localizedDescription)
            }
        } catch is CancellationError {
            throw .cancelled
        } catch {
            throw .transport(String(describing: error))
        }
    }

    private func perform<Response>(
        _ endpoint: Endpoint<Response>,
        allowAuthRetry: Bool
    ) async throws -> Response {
        let request = try await makeRequest(for: endpoint)
        let (data, response) = try await transport.data(for: request)

        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        logger.debug("\(endpoint.method.rawValue, privacy: .public) \(endpoint.path, privacy: .public) -> \(http.statusCode)")

        switch http.statusCode {
        case 200..<300:
            return try decode(Response.self, from: data)
        case 401 where endpoint.requiresAuth && allowAuthRetry:
            await tokens?.invalidateToken()
            return try await perform(endpoint, allowAuthRetry: false)
        case 401:
            throw NetworkError.unauthorized
        default:
            throw NetworkError.http(statusCode: http.statusCode, body: data)
        }
    }

    private func decode<Response: Decodable>(_ type: Response.Type, from data: Data) throws -> Response {
        if data.isEmpty, let empty = EmptyResponse() as? Response {
            return empty
        }
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            logger.error("Decoding \(String(describing: Response.self), privacy: .public) failed: \(String(describing: error), privacy: .public)")
            throw NetworkError.decoding(String(describing: error))
        }
    }

    private func makeRequest<Response>(for endpoint: Endpoint<Response>) async throws -> URLRequest {
        guard var components = URLComponents(
            url: baseURL.appending(path: endpoint.path),
            resolvingAgainstBaseURL: false
        ) else { throw NetworkError.invalidRequest }
        if !endpoint.query.isEmpty { components.queryItems = endpoint.query }
        guard let url = components.url else { throw NetworkError.invalidRequest }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if endpoint.requiresAuth, let tokens {
            let token = try await tokens.validToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
}

// MARK: - DTO mapping and repository

enum MappingError: Error, Equatable {
    case unknownRole(String)
}

extension User {
    init(dto: UserDTO) throws {
        guard let role = Role(rawValue: dto.role) else { throw MappingError.unknownRole(dto.role) }
        self.init(id: ID(dto.id), name: dto.fullName, email: dto.email, role: role)
    }
}

public struct RemoteUserRepository: UserRepository {
    let client: HTTPClient

    public init(client: HTTPClient) {
        self.client = client
    }

    public func allUsers() async throws -> [User] {
        let page = try await client.send(UsersEndpoints.list(cursor: nil))
        return try page.items.map(User.init(dto:))
    }

    public func user(id: User.ID) async throws -> User {
        try User(dto: await client.send(UsersEndpoints.user(id: id)))
    }

    public func save(_ user: User) async throws {
        _ = try await client.send(UsersEndpoints.update(id: user.id, UpdateUserRequest(user)))
    }
}

// MARK: - Retry

func withRetry<T>(
    maxAttempts: Int = 3,
    initialDelay: Duration = .milliseconds(500),
    isRetryable: (any Error) -> Bool,
    operation: () async throws -> T
) async throws -> T {
    var attempt = 1
    var delay = initialDelay
    while true {
        do {
            return try await operation()
        } catch let error where attempt < maxAttempts && isRetryable(error) {
            try await Task.sleep(for: delay)
            delay *= 2
            attempt += 1
        }
    }
}

extension NetworkError {
    var isTransient: Bool {
        switch self {
        case .offline, .timeout: true
        case .http(let statusCode, _): [502, 503, 504].contains(statusCode)
        case .invalidRequest, .invalidResponse, .cancelled, .unauthorized, .decoding, .transport: false
        }
    }
}

func loadUser(id: User.ID, client: HTTPClient) async throws -> UserDTO {
    try await withRetry(isRetryable: { ($0 as? NetworkError)?.isTransient ?? false }) {
        try await client.send(UsersEndpoints.user(id: id))
    }
}

// MARK: - Typed throws at a layer boundary

enum PaymentError: Error, Equatable {
    case offline
    case cardDeclined(reason: String)
    case server(statusCode: Int)
    case unknown
}

struct PaymentsClient: Sendable {
    let transport: any HTTPTransport

    func pay(_ request: URLRequest) async throws(PaymentError) {
        do {
            let (_, response) = try await transport.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw PaymentError.unknown }
            switch http.statusCode {
            case 200..<300: return
            case 402: throw PaymentError.cardDeclined(reason: "insufficient_funds")
            default: throw PaymentError.server(statusCode: http.statusCode)
            }
        } catch let error as PaymentError {
            throw error
        } catch let error as URLError where error.code == .notConnectedToInternet {
            throw .offline
        } catch {
            throw .unknown
        }
    }
}

@MainActor
final class CheckoutModel {
    var message = ""

    func pay(client: PaymentsClient, request: URLRequest) async {
        do throws(PaymentError) {
            try await client.pay(request)
            message = "Paid"
        } catch {
            switch error {
            case .offline: message = "You're offline."
            case .cardDeclined: message = "Your card was declined."
            case .server, .unknown: message = "Something went wrong. Try again."
            }
        }
    }
}
