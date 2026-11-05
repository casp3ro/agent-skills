// This module uses main-actor default isolation (like an Xcode app target), so these examples also
// verify the isolation claims in the rules: `nonisolated` types, `@concurrent` helpers, `@Entry` defaults.
//
// Rules: architecture-observable-models, architecture-thin-views, architecture-dependency-injection,
// architecture-navigation-as-data, architecture-layered-dependencies, concurrency-main-actor-state,
// concurrency-concurrent-cpu-work, concurrency-structured-tasks, memory-*, persistence-choose-store,
// tooling-xcconfig-environments, realtime-push-notifications

import Foundation
import SwiftUI
import UserNotifications
import ValidationCore
#if os(iOS)
import UIKit
#endif

// MARK: - Observable models (architecture-observable-models)

@MainActor
@Observable
final class SettingsModel {
    var username = ""
    var notificationsEnabled = true
}

struct SettingsView: View {
    @State private var model = SettingsModel()

    var body: some View {
        Form {
            TextField("Username", text: $model.username)
            NotificationsRow(model: model)
        }
    }
}

struct NotificationsRow: View {
    @Bindable var model: SettingsModel

    var body: some View {
        Toggle("Notifications", isOn: $model.notificationsEnabled)
    }
}

// MARK: - Feature model with LoadState (modeling-enum-state, testing-swift-testing)

@MainActor
@Observable
final class UserListModel {
    private(set) var state: LoadState<[User]> = .idle
    var searchQuery = ""

    private let repository: any UserRepository

    init(repository: any UserRepository) {
        self.repository = repository
    }

    var filteredUsers: [User] {
        guard case .loaded(let users) = state else { return [] }
        guard !searchQuery.isEmpty else { return users }
        return users.filter { $0.name.localizedCaseInsensitiveContains(searchQuery) }
    }

    func load() async {
        state = .loading
        do {
            state = .loaded(try await repository.allUsers())
        } catch is CancellationError {
            state = .idle
        } catch {
            state = .failed(error)
        }
    }
}

struct UserListView: View {
    @State private var model: UserListModel

    init(repository: any UserRepository) {
        _model = State(initialValue: UserListModel(repository: repository))
    }

    var body: some View {
        content
            .searchable(text: $model.searchQuery)
            .task { await model.load() }
            .navigationTitle("Users")
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .idle, .loading:
            ProgressView()
        case .loaded:
            List(model.filteredUsers) { user in
                Text(user.name)
            }
        case .failed(let error):
            ContentUnavailableView(
                "Couldn't load users",
                systemImage: "exclamationmark.triangle",
                description: Text(error.localizedDescription)
            )
        }
    }
}

// MARK: - Dependency injection (architecture-dependency-injection, tooling-xcconfig-environments)

struct AppConfig: Sendable {
    let apiBaseURL: URL

    static let current: AppConfig = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("API_BASE_URL is missing from Info.plist")
        }
        return AppConfig(apiBaseURL: url)
    }()
}

nonisolated struct AppDependencies: Sendable {
    var userRepository: any UserRepository

    static let preview = AppDependencies(
        userRepository: InMemoryUserRepository(users: [.sample(name: "Ada"), .sample(name: "Grace")])
    )

    @MainActor
    static func live(config: AppConfig) -> AppDependencies {
        let client = HTTPClient(baseURL: config.apiBaseURL)
        return AppDependencies(userRepository: RemoteUserRepository(client: client))
    }
}

extension EnvironmentValues {
    @Entry var dependencies: AppDependencies = .preview
}

struct UsersScreen: View {
    @Environment(\.dependencies) private var dependencies

    var body: some View {
        UserListView(repository: dependencies.userRepository)
    }
}

struct CompositionRootPreview: View {
    var body: some View {
        UsersScreen()
            .environment(\.dependencies, .preview)
    }
}

// MARK: - Navigation as data (architecture-navigation-as-data)

enum Route: Hashable {
    case orderDetail(Order.ID)
    case settings
}

@MainActor
@Observable
final class Router {
    var path: [Route] = []

    func open(_ route: Route) { path.append(route) }
    func popToRoot() { path.removeAll() }
}

extension Tagged where Tag == Order, RawValue == UUID {
    init?(deepLink url: URL) {
        guard let uuid = UUID(uuidString: url.lastPathComponent) else { return nil }
        self.init(uuid)
    }
}

struct OrderDetailView: View {
    let orderID: Order.ID

    var body: some View {
        Text(orderID.rawValue.uuidString)
    }
}

struct RootView: View {
    @State private var router = Router()
    let orders: [Order]

    var body: some View {
        NavigationStack(path: $router.path) {
            List(orders) { order in
                NavigationLink(value: Route.orderDetail(order.id)) { Text(order.title) }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .orderDetail(let id): OrderDetailView(orderID: id)
                case .settings: SettingsView()
                }
            }
        }
        .environment(router)
        .onOpenURL { url in
            if let id = Order.ID(deepLink: url) { router.open(.orderDetail(id)) }
        }
    }
}

// MARK: - Thin views (architecture-thin-views)

struct CardTransaction: Identifiable, Sendable {
    let id: UUID
    let merchant: String
    let amount: Decimal
    let currencyCode: String
    let date: Date
}

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

// MARK: - Structured tasks (concurrency-structured-tasks)

struct SearchResult: Identifiable, Sendable {
    let id: UUID
    let title: String
}

@MainActor
@Observable
final class SearchModel {
    var query = ""
    private(set) var results: [SearchResult] = []

    func observeUpdates() async {
        // e.g. `for await update in stream { ... }`; ends when the view's task is cancelled.
    }

    func search() async {
        results = query.isEmpty ? [] : [SearchResult(id: UUID(), title: query)]
    }
}

struct SearchView: View {
    @State private var model = SearchModel()

    var body: some View {
        List(model.results) { Text($0.title) }
            .searchable(text: $model.query)
            .task { await model.observeUpdates() }
            .task(id: model.query) {
                try? await Task.sleep(for: .milliseconds(300))
                guard !Task.isCancelled else { return }
                await model.search()
            }
    }
}

// MARK: - @concurrent in a main-actor-default module (concurrency-concurrent-cpu-work)

nonisolated enum CSVParser {
    static func summarize(_ data: Data) -> String {
        let rows = String(decoding: data, as: UTF8.self).split(whereSeparator: \.isNewline)
        return "\(rows.count) rows"
    }
}

nonisolated struct ReportProcessor {
    @concurrent
    func summarize(_ csv: Data) async -> String {
        CSVParser.summarize(csv)
    }
}

@MainActor
final class ReportModel {
    var summary = ""
    private let processor = ReportProcessor()

    func process(_ csv: Data) async {
        summary = await processor.summarize(csv)
    }
}

// MARK: - Layered dependencies (architecture-layered-dependencies)

extension Plan {
    var badgeColor: Color {
        switch self {
        case .free: .gray
        case .pro: .purple
        case .team: .blue
        }
    }
}

// MARK: - Memory (memory-weak-self-stored-closures, memory-no-reflexive-weak-self, memory-weak-delegates)

final class Downloader {
    var onProgress: ((Double) -> Void)?
    private(set) var progress = 0.0

    func start() {
        onProgress = { [weak self] value in
            guard let self else { return }
            self.progress = value
        }
    }
}

struct CartItem: Sendable {
    let price: Decimal
    let quantity: Int
}

@MainActor
final class CartModel {
    var items: [CartItem] = []

    var total: Decimal {
        items.reduce(0) { sum, item in
            sum + item.price * Decimal(item.quantity) + fee(for: item)
        }
    }

    func fee(for item: CartItem) -> Decimal { 0 }
}

@MainActor
protocol BarcodeScannerDelegate: AnyObject {
    func scanner(_ scanner: BarcodeScanner, didRead code: String)
}

@MainActor
final class BarcodeScanner {
    weak var delegate: (any BarcodeScannerDelegate)?

    func simulateRead(_ code: String) {
        delegate?.scanner(self, didRead: code)
    }
}

// MARK: - Choosing a store (persistence-choose-store)

struct OnboardingGate: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        if hasSeenOnboarding {
            Text("Home")
        } else {
            Button("Get started") { hasSeenOnboarding = true }
        }
    }
}

// MARK: - Push notifications (realtime-push-notifications)

@MainActor
final class PushCoordinator: NSObject, UNUserNotificationCenterDelegate {
    var onDeviceToken: ((String) -> Void)?
    var onOpenOrder: ((String) -> Void)?

    func requestAuthorization() async throws -> Bool {
        try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
    }

    func didRegister(deviceToken: Data) {
        onDeviceToken?(deviceToken.map { String(format: "%02x", $0) }.joined())
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        guard let orderID = response.notification.request.content.userInfo["order_id"] as? String else { return }
        await openOrder(orderID)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    private func openOrder(_ orderID: String) {
        onOpenOrder?(orderID)
    }
}

#if os(iOS)
final class AppDelegate: NSObject, UIApplicationDelegate {
    let push = PushCoordinator()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = push
        application.registerForRemoteNotifications()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        push.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        // Simulator without APNs support, missing entitlement, or no network.
    }
}
#endif
