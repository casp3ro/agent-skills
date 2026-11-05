---
title: Expose WebSockets as AsyncThrowingStream with Reconnect and Resync
impact: MEDIUM
impactDescription: live updates that survive network changes
tags: realtime, websocket, asyncstream, reconnect
---

## Expose WebSockets as AsyncThrowingStream with Reconnect and Resync

**Impact: MEDIUM (live updates that survive network changes)**

Wrap `URLSessionWebSocketTask` in a function returning `AsyncThrowingStream`, so features consume events with `for try await` and cancellation closes the socket. Sockets drop on network changes: reconnect with capped exponential backoff and re-sync state through REST after every (re)connect, because events sent while disconnected are lost. A stateless client does not need to be an actor.

**Incorrect (callback recursion, no cleanup, no reconnect, no resync):**

```swift
import Foundation

final class LiveClient {
    var onEvent: ((ServerEvent) -> Void)?
    private var socket: URLSessionWebSocketTask?

    func connect(url: URL) {
        socket = URLSession.shared.webSocketTask(with: url)
        socket?.resume()
        listen()
    }

    private func listen() {
        socket?.receive { result in
            if case .success(.string(let text)) = result,
               let event = try? JSONDecoder().decode(ServerEvent.self, from: Data(text.utf8)) {
                self.onEvent?(event) // strong self capture; stops forever on first failure
                self.listen()
            }
        }
    }
}
```

**Correct (stream with cleanup; consumer reconnects and resyncs):**

```swift
import Foundation
import Observation
import OSLog

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
                        // Skip unknown event types for forward compatibility.
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

    /// Run from `.task { }` so it is cancelled with the view.
    func observe(client: LiveUpdatesClient, token: String, resync: () async throws -> [Order.ID: OrderStatus]) async {
        var delay: Duration = .seconds(1)
        while !Task.isCancelled {
            do {
                statuses = try await resync() // catch up on anything missed while disconnected
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
                return // cancelled
            }
            delay = min(delay * 2, .seconds(30))
        }
    }
}
```

For one-way server streams, Server-Sent Events over `URLSession.bytes(for:)` with `for try await line in bytes.lines` are simpler than WebSockets.

Reference: [URLSessionWebSocketTask](https://developer.apple.com/documentation/foundation/urlsessionwebsockettask)
