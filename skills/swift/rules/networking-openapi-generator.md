---
title: Generate Clients from OpenAPI for Large APIs
impact: MEDIUM
impactDescription: removes hand-written endpoint drift
tags: networking, openapi, codegen, spm-plugin
---

## Generate Clients from OpenAPI for Large APIs

**Impact: MEDIUM (removes hand-written endpoint drift)**

When the backend publishes an OpenAPI document, generate the Swift client with Apple's Swift OpenAPI Generator (an SPM build plugin) instead of hand-writing dozens of endpoints and DTOs. It is the Swift counterpart of `openapi-typescript`: types and client methods are regenerated on every build, and every documented response is an enum case you must handle.

**Incorrect (hand-maintained copies of 80 backend endpoints):**

```swift
enum BillingEndpoints {
    static func invoices() -> Endpoint<[InvoiceDTO]> { Endpoint(.get, "/v1/invoices") }
    static func invoice(id: String) -> Endpoint<InvoiceDTO> { Endpoint(.get, "/v1/invoices/\(id)") }
    // ...78 more, silently drifting from the server
}
```

**Correct (generated types and client from `openapi.yaml`):**

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    dependencies: [
        .package(url: "https://github.com/apple/swift-openapi-generator", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "BillingAPI",
            dependencies: [
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
    ]
)
```

```yaml
# Sources/BillingAPI/openapi-generator-config.yaml  (openapi.yaml sits next to it)
generate:
  - types
  - client
accessModifier: internal
```

```swift
import Foundation
import OpenAPIRuntime
import OpenAPIURLSession

struct BillingRepository {
    private let client = Client(
        serverURL: URL(string: "https://api.example.com")!,
        transport: URLSessionTransport()
    )

    func invoice(id: String) async throws -> Components.Schemas.Invoice {
        let response = try await client.getInvoice(path: .init(id: id)) // operationId: getInvoice
        switch response {
        case .ok(let ok):
            return try ok.body.json
        case .notFound:
            throw BillingError.notFound
        case .undocumented(let statusCode, _):
            throw BillingError.unexpectedStatus(statusCode)
        }
    }
}
```

Generated method and type names come from `operationId` and schema names in your spec. Keep mapping generated types to domain models in the repository, as with hand-written DTOs.

Reference: [Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator)
