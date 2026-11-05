---
title: Features Depend on Domain Protocols, Not on Each Other
impact: HIGH
impactDescription: features build and test in isolation
tags: modules, boundaries, features, dependency-inversion
---

## Features Depend on Domain Protocols, Not on Each Other

**Impact: HIGH (features build and test in isolation)**

A feature module should depend on `Domain` (and `DesignSystem`), never on `Networking`, `Persistence`, or another feature. Concrete implementations are wired together only in the app's composition root. Then a change to the HTTP client does not rebuild the UI, and a feature compiles and tests with fakes. Features talk to each other through navigation routes or domain protocols.

**Incorrect (feature reaches into the data layer and another feature):**

```swift
// Sources/FeatureCheckout/CheckoutModel.swift
import Networking   // concrete client
import FeatureCart  // another feature
import Observation

@MainActor
@Observable
final class CheckoutModel {
    let client = HTTPClient.live
    let cart = CartModel()
}
```

**Correct (feature sees only protocols from Domain):**

```swift
// Sources/Domain/CheckoutRepository.swift
public protocol CheckoutRepository: Sendable {
    func currentCart() async throws -> Cart
    func placeOrder(_ cart: Cart) async throws -> Order.ID
}

// Sources/FeatureCheckout/CheckoutModel.swift
import Domain
import Observation

@MainActor
@Observable
public final class CheckoutModel {
    private let repository: any CheckoutRepository
    public private(set) var cart: Cart?

    public init(repository: any CheckoutRepository) {
        self.repository = repository
    }

    public func load() async throws {
        cart = try await repository.currentCart()
    }
}

// App/MyApp.swift (composition root) is the only place that imports both:
// import Networking; import FeatureCheckout
// CheckoutModel(repository: RemoteCheckoutRepository(client: client))
```

Reference: [Swift Package Manager](https://www.swift.org/documentation/package-manager/)
