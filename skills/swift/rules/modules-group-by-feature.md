---
title: Group Files by Feature, One Primary Type per File
impact: MEDIUM
impactDescription: related code changes together
tags: modules, files, organization, conventions
---

## Group Files by Feature, One Primary Type per File

**Impact: MEDIUM (related code changes together)**

Inside a module, group files by feature (screen), not by kind (`Views/`, `ViewModels/`). Name each file after its primary type; put extensions in `Type+Purpose.swift`. Inside a type, order members as stored properties, initializers, public methods, then private helpers, and put each protocol conformance in its own extension marked with `// MARK: -`.

**Incorrect (grouped by kind; one feature spread over four folders):**

```text
FeatureUsers/
├── Views/UserListView.swift
├── Views/UserDetailView.swift
├── ViewModels/UserListViewModel.swift
├── ViewModels/UserDetailViewModel.swift
└── Helpers/Extensions.swift      # 900 lines of unrelated extensions
```

**Correct (grouped by feature; small focused files):**

```text
FeatureUsers/
├── UserList/
│   ├── UserListView.swift
│   ├── UserListModel.swift
│   └── UserRow.swift
├── UserDetail/
│   ├── UserDetailView.swift
│   └── UserDetailModel.swift
├── User+Formatting.swift
└── FeatureUsers.swift            # public entry points
```

```swift
import Foundation

struct UserRowViewData: Identifiable, Sendable {
    let id: User.ID
    let name: String
    let email: String
}

// MARK: - CustomStringConvertible

extension UserRowViewData: CustomStringConvertible {
    var description: String { "\(name) <\(email)>" }
}
```

Reference: [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
