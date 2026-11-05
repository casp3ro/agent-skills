---
title: Configure Environments with xcconfig, Never Ship Secrets
impact: MEDIUM
impactDescription: per-environment builds without code changes
tags: tooling, xcconfig, environments, secrets, configuration
---

## Configure Environments with xcconfig, Never Ship Secrets

**Impact: MEDIUM (per-environment builds without code changes)**

There is no `.env` at runtime: everything in the app bundle ships to users and can be extracted. Define per-configuration values (API base URL, bundle ID suffix) in `.xcconfig` files, surface them through `Info.plist`, and read them once into a typed config. Secrets for paid third-party APIs belong on your backend, not in the app. Use `#if DEBUG` only for developer tooling.

**Incorrect (environment switched by editing code; secret key in the binary):**

```swift
enum Config {
    static let baseURL = "https://staging-api.example.com" // edited by hand before release
    static let openAIKey = "sk-..."                          // extractable from the app bundle
}
```

**Correct (xcconfig → Info.plist → typed config):**

```text
// App/Config/Staging.xcconfig
API_BASE_URL = https:/$()/staging-api.example.com
PRODUCT_BUNDLE_IDENTIFIER = com.example.app.staging
```

```xml
<!-- Info.plist -->
<key>API_BASE_URL</key>
<string>$(API_BASE_URL)</string>
```

```swift
import Foundation

struct AppConfig: Sendable {
    let apiBaseURL: URL

    static let current: AppConfig = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("API_BASE_URL is missing from Info.plist") // misconfigured build: fail fast
        }
        return AppConfig(apiBaseURL: url)
    }()
}
```

`$()` in the xcconfig value is required because `//` starts a comment in xcconfig files. Create one Xcode configuration (Debug, Staging, Release) per environment and assign each its xcconfig.

Reference: [Adding a build configuration file to your project](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)
