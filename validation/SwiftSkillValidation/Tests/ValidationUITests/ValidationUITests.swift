import Foundation
import Testing
import ValidationCore
@testable import ValidationUI

@Suite("UserListModel")
@MainActor
struct UserListModelTests {
    @Test func loadsUsers() async throws {
        let model = UserListModel(repository: InMemoryUserRepository(users: [.sample(name: "Ada")]))

        await model.load()

        guard case .loaded(let users) = model.state else {
            Issue.record("Expected loaded state, got \(model.state)")
            return
        }
        #expect(users.map(\.name) == ["Ada"])
    }

    @Test("Search is case-insensitive", arguments: ["ada", "ADA", "Ad"])
    func search(query: String) async {
        let model = UserListModel(repository: InMemoryUserRepository(users: [.sample(name: "Ada"), .sample(name: "Bob")]))
        await model.load()

        model.searchQuery = query

        #expect(model.filteredUsers.map(\.name) == ["Ada"])
    }

    @Test func surfacesFailures() async {
        let model = UserListModel(repository: FailingUserRepository(error: NetworkError.offline))
        await model.load()

        guard case .failed(let error) = model.state else {
            Issue.record("Expected failed state")
            return
        }
        #expect(error as? NetworkError == .offline)
    }
}

@MainActor
@Test func concurrentReportProcessingReturnsToMainActor() async {
    let model = ReportModel()
    await model.process(Data("a,b\nc,d\n".utf8))
    #expect(model.summary == "2 rows")
}

@MainActor
@Test func routerHandlesDeepLinks() throws {
    let router = Router()
    let uuid = UUID()
    let url = try #require(URL(string: "myapp://orders/\(uuid.uuidString)"))
    let id = try #require(Order.ID(deepLink: url))

    router.open(.orderDetail(id))

    #expect(router.path == [.orderDetail(Order.ID(uuid))])
}

@MainActor
@Test func previewDependenciesAreUsable() async throws {
    let users = try await AppDependencies.preview.userRepository.allUsers()
    #expect(users.count == 2)
}

@MainActor
@Test func downloaderDoesNotLeak() {
    weak var weakDownloader: Downloader?
    do {
        let downloader = Downloader()
        downloader.start()
        weakDownloader = downloader
    }
    #expect(weakDownloader == nil)
}
