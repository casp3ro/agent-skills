---
title: Store Secrets in the Keychain
impact: HIGH
impactDescription: tokens encrypted at rest
tags: persistence, keychain, security, tokens
---

## Store Secrets in the Keychain

**Impact: HIGH (tokens encrypted at rest)**

The Keychain encrypts items with keys tied to the device and the user's passcode. Wrap the C-style `Security` API in a small `Sendable` type that the rest of the app uses. Choose the accessibility class deliberately: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` allows background refresh after the first unlock and keeps the item out of backups that move to other devices.

**Incorrect (secret in a plain file or UserDefaults):**

```swift
import Foundation

let url = URL.documentsDirectory.appending(path: "token.txt")
try refreshToken.write(to: url, atomically: true, encoding: .utf8)
```

**Correct (minimal Keychain wrapper):**

```swift
import Foundation
import Security

struct Keychain: Sendable {
    enum KeychainError: Error, Equatable {
        case unexpectedStatus(OSStatus)
    }

    let service: String

    func set(_ value: Data, for key: String) throws {
        let query = baseQuery(for: key)
        SecItemDelete(query as CFDictionary) // replace any existing item

        var attributes = query
        attributes[kSecValueData as String] = value
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.unexpectedStatus(status) }
    }

    func data(for key: String) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess: return result as? Data
        case errSecItemNotFound: return nil
        default: throw KeychainError.unexpectedStatus(status)
        }
    }

    func delete(_ key: String) throws {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
```

Keychain items survive app deletion on iOS; clear them on first launch after reinstall if your app requires a fresh sign-in.

Reference: [Keychain services](https://developer.apple.com/documentation/security/keychain-services)
