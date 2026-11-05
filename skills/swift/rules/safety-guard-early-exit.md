---
title: Use guard for Early Exit
impact: MEDIUM
impactDescription: flat happy path, unwrapped values in scope
tags: safety, guard, optionals, readability
---

## Use guard for Early Exit

**Impact: MEDIUM (flat happy path, unwrapped values in scope)**

`guard` validates preconditions at the top of a function and exits early. Values unwrapped by `guard let` stay in scope for the rest of the function, so the happy path is not nested. Since Swift 5.7, `if let name` and `guard let name` unwrap a variable into a shadow of the same name.

**Incorrect (pyramid of nested if-lets):**

```swift
func sendInvite(to email: String?, team: Team?) async throws {
    if let email {
        if let team {
            if team.canInvite {
                try await api.invite(email: email, teamID: team.id)
            }
        }
    }
}
```

**Correct (guard clauses, then the happy path):**

```swift
func sendInvite(to email: String?, team: Team?) async throws {
    guard let email, !email.isEmpty else { throw InviteError.missingEmail }
    guard let team else { throw InviteError.missingTeam }
    guard team.canInvite else { throw InviteError.notAllowed }

    try await api.invite(email: email, teamID: team.id)
}

enum InviteError: Error {
    case missingEmail, missingTeam, notAllowed
}
```

Reference: [Early Exit](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Early-Exit)
