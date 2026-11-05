---
title: Keep Business Logic out of View Bodies
impact: HIGH
impactDescription: body runs on every render
tags: architecture, swiftui, performance, views
---

## Keep Business Logic out of View Bodies

**Impact: HIGH (body runs on every render)**

A SwiftUI `View` is a cheap value that describes UI, like a JSX element. `body` can run many times per second. Do not sort, filter, format, or call services inside it. Put logic in the model (computed properties, methods), keep `body` a declarative mapping from state to views, and split large bodies into small subviews.

**Incorrect (filtering, sorting, and formatter allocation inside body):**

```swift
import SwiftUI

struct TransactionsView: View {
    let transactions: [CardTransaction]
    @State private var query = ""

    var body: some View {
        let visible = transactions
            .filter { query.isEmpty || $0.merchant.localizedCaseInsensitiveContains(query) }
            .sorted { $0.date > $1.date }
        let formatter = NumberFormatter() // allocated on every render
        formatter.numberStyle = .currency

        return List(visible) { tx in
            Text("\(tx.merchant): \(formatter.string(from: tx.amount as NSNumber) ?? "")")
        }
        .searchable(text: $query)
    }
}
```

**Correct (model owns the logic; body only maps state to views):**

```swift
import SwiftUI

@MainActor
@Observable
final class TransactionsModel {
    var query = ""
    private(set) var transactions: [CardTransaction] = []

    init(transactions: [CardTransaction]) {
        self.transactions = transactions.sorted { $0.date > $1.date }
    }

    var visible: [CardTransaction] {
        guard !query.isEmpty else { return transactions }
        return transactions.filter { $0.merchant.localizedCaseInsensitiveContains(query) }
    }
}

struct TransactionsView: View {
    @State var model: TransactionsModel

    var body: some View {
        List(model.visible) { TransactionRow(transaction: $0) }
            .searchable(text: $model.query)
    }
}

struct TransactionRow: View {
    let transaction: CardTransaction

    var body: some View {
        LabeledContent(transaction.merchant) {
            Text(transaction.amount, format: .currency(code: transaction.currencyCode))
        }
    }
}
```

`Text(_:format:)` uses cached `FormatStyle`s; prefer it over hand-built formatters in views.

Reference: [SwiftUI Essentials](https://developer.apple.com/videos/play/wwdc2024/10150/)
