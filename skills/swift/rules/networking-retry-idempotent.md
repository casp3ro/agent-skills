---
title: Retry Only Idempotent Requests with Backoff
impact: MEDIUM
impactDescription: resilience without duplicate side effects
tags: networking, retry, backoff, idempotency
---

## Retry Only Idempotent Requests with Backoff

**Impact: MEDIUM (resilience without duplicate side effects)**

Retry transient failures (timeouts, connection loss, 502/503/504) with exponential backoff, and only for idempotent operations (GET, PUT, DELETE) or requests that carry an idempotency key. Retrying a POST that already succeeded on the server charges a card twice. Do not retry client errors (4xx) or cancellation.

**Incorrect (blind immediate retries of any request):**

```swift
func createOrder(_ request: CreateOrderRequest) async throws -> Order {
    for _ in 0..<3 {
        if let order = try? await api.createOrder(request) { return order } // may create 3 orders
    }
    throw OrderError.failed
}
```

**Correct (retry helper with backoff and an explicit retry predicate):**

```swift
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
            try await Task.sleep(for: delay) // throws CancellationError if cancelled
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

// GET is idempotent: safe to retry.
func loadUser(id: User.ID, client: HTTPClient) async throws -> UserDTO {
    try await withRetry(isRetryable: { ($0 as? NetworkError)?.isTransient ?? false }) {
        try await client.send(UsersEndpoints.user(id: id))
    }
}
```

For non-idempotent writes, send an `Idempotency-Key` header with a UUID generated once per user action, and retry only if the backend supports it.

Reference: [Task.sleep(for:tolerance:clock:)](https://developer.apple.com/documentation/swift/task/sleep(for:tolerance:clock:))
