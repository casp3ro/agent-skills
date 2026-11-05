---
title: Centralize Requests in One HTTP Client with an Injected Transport
impact: HIGH
impactDescription: one place for auth, decoding, logging, errors
tags: networking, http-client, urlsession, testing, errors
---

## Centralize Requests in One HTTP Client with an Injected Transport

**Impact: HIGH (one place for auth, decoding, logging, errors)**

Build one `HTTPClient` that owns the base URL, JSON configuration, authorization, logging, and error mapping. Inject the transport behind a protocol so tests can stub responses without the network. Reuse a single `URLSession`; never create one per request. Map transport errors to one `NetworkError` type so callers never see `URLError`.

**Incorrect (each repository builds requests, decoders, and error handling itself):**

```swift
import Foundation

struct RemoteOrdersRepository {
    func orders(token: String) async throws -> [OrderDTO] {
        let session = URLSession(configuration: .default) // new session per call
        var request = URLRequest(url: URL(string: "https://api.example.com/v1/orders")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await session.data(for: request) // status code ignored
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([OrderDTO].self, from: data)
    }
}
```

**Correct (one client; transport and token provider injected):**

```swift
import Foundation
import OSLog

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
            return try await perform(endpoint, allowAuthRetry: false) // retry once with a fresh token
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
```

`.iso8601` does not accept fractional seconds; if your API sends them, use `.custom` with `Date.ISO8601FormatStyle(includingFractionalSeconds: true)`. For custom timeouts or caching, create one `URLSessionConfiguration` at startup and pass `URLSession(configuration:)` to the transport.

Reference: [Fetching website data into memory](https://developer.apple.com/documentation/foundation/fetching-website-data-into-memory)
