---
title: Verify Webhook Signatures and Process Events Idempotently
impact: HIGH
impactDescription: blocks forged events and double processing
tags: realtime, webhooks, vapor, hmac, idempotency, server
---

## Verify Webhook Signatures and Process Events Idempotently

**Impact: HIGH (blocks forged events and double processing)**

When the backend is written in Swift (Vapor), apply the same rules as in Node: verify the HMAC signature over the raw body with a constant-time comparison, reject stale timestamps to stop replays, deduplicate by event ID because providers retry, acknowledge quickly with 2xx, and do heavy work in a background job.

**Incorrect (trusts any POST, decodes before verifying, processes retries twice):**

```swift
import Vapor

func routes(_ app: Application) throws {
    app.post("webhooks", "payments") { req async throws -> HTTPStatus in
        let event = try req.content.decode(PaymentEvent.self) // anyone can forge this
        try await fulfill(event)                               // slow; provider retries; double fulfillment
        return .ok
    }
}
```

**Correct (Vapor 4: signature, timestamp, idempotency, async job):**

```swift
import Crypto               // swift-crypto (CryptoKit API on Linux)
import Foundation
import NIOFoundationCompat  // Data(buffer:)
import Vapor

protocol WebhookEventLog: Sendable {
    /// Returns false if the event was already recorded (e.g. INSERT ... ON CONFLICT DO NOTHING).
    func markProcessedIfNew(_ eventID: String) async throws -> Bool
}

protocol JobQueue: Sendable {
    func enqueue(_ event: PaymentEvent) async throws
}

struct PaymentEvent: Codable, Sendable {
    let id: String
    let type: String
    let paymentID: String
}

struct PaymentWebhookController: RouteCollection {
    let signingSecret: SymmetricKey
    let eventLog: any WebhookEventLog
    let jobs: any JobQueue
    let tolerance: TimeInterval = 300

    func boot(routes: any RoutesBuilder) throws {
        routes.on(.POST, "webhooks", "payments", body: .collect(maxSize: "1mb"), use: receive)
    }

    @Sendable
    func receive(req: Request) async throws -> HTTPStatus {
        guard
            let timestampHeader = req.headers.first(name: "X-Webhook-Timestamp"),
            let timestamp = TimeInterval(timestampHeader),
            let signatureHex = req.headers.first(name: "X-Webhook-Signature"),
            let signature = Data(hexString: signatureHex),
            let buffer = req.body.data
        else { throw Abort(.badRequest) }

        guard abs(Date().timeIntervalSince1970 - timestamp) <= tolerance else {
            throw Abort(.unauthorized, reason: "Stale timestamp")
        }

        let body = Data(buffer: buffer)
        let signedPayload = Data("\(timestampHeader).".utf8) + body
        guard HMAC<SHA256>.isValidAuthenticationCode(signature, authenticating: signedPayload, using: signingSecret) else {
            throw Abort(.unauthorized, reason: "Invalid signature")
        }

        let event = try JSONDecoder().decode(PaymentEvent.self, from: body)
        guard try await eventLog.markProcessedIfNew(event.id) else { return .ok } // retry of a handled event

        try await jobs.enqueue(event) // fulfillment, push notifications, etc.
        return .ok
    }
}

extension Data {
    init?(hexString: String) {
        guard hexString.count.isMultiple(of: 2) else { return nil }
        var bytes: [UInt8] = []
        bytes.reserveCapacity(hexString.count / 2)
        var index = hexString.startIndex
        while index < hexString.endIndex {
            let next = hexString.index(index, offsetBy: 2)
            guard let byte = UInt8(hexString[index..<next], radix: 16) else { return nil }
            bytes.append(byte)
            index = next
        }
        self.init(bytes)
    }
}
```

Header names and the signed-payload format differ per provider (Stripe signs `timestamp.body` in a `Stripe-Signature` header); follow the provider's documentation exactly. Vapor 5 is in beta at the time of writing and changes routing APIs; check the version you use.

Reference: [Vapor Docs](https://docs.vapor.codes), [swift-crypto](https://github.com/apple/swift-crypto)
