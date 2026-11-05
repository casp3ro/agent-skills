---
title: Throw Domain Errors and Map Them at Layer Boundaries
impact: HIGH
impactDescription: UI never depends on transport details
tags: safety, errors, throws, typed-throws, boundaries
---

## Throw Domain Errors and Map Them at Layer Boundaries

**Impact: HIGH (UI never depends on transport details)**

Define errors as enums conforming to `Error`, with associated values that carry context. Convert low-level errors (`URLError`, `DecodingError`, SQLite errors) into your own types at the boundary of the layer that produced them, so features never import transport details. Swift 6 typed throws (`throws(NetworkError)`) make the error type part of the signature; use them for closed, stable error sets inside a module, and keep untyped `throws` on public APIs that may evolve.

**Incorrect (raw URLError reaches the UI; errors carry no context):**

```swift
import Foundation

@MainActor
final class CheckoutModel {
    var message = ""
    func pay(client: PaymentsClient) async {
        do {
            try await client.pay()
        } catch let error as URLError where error.code == .notConnectedToInternet {
            message = "Offline" // every feature repeats transport-specific checks
        } catch {
            message = "\(error)" // leaks internals to users
        }
    }
}
```

**Correct (layer maps errors once; features switch over a domain enum):**

```swift
import Foundation

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
            // `do throws(PaymentError)` makes `error` statically PaymentError: the switch is exhaustive.
            switch error {
            case .offline: message = "You're offline."
            case .cardDeclined: message = "Your card was declined."
            case .server, .unknown: message = "Something went wrong. Try again."
            }
        }
    }
}
```

Reference: [SE-0413 Typed throws](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md), [Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/)
