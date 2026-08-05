import Foundation
import SwiftUI

/// Observable session state shared by the native screens.
///
/// The cookie jar is the source of truth (it's shared with the web view), so on
/// launch this just asks the server whether the stored cookie is still good.
@MainActor
final class AuthStore: ObservableObject {
    enum State: Equatable {
        case unknown
        case signedOut
        case signedIn(username: String)
    }

    @Published private(set) var state: State = .unknown
    @Published var suspensionNotice: String?

    var username: String? {
        if case .signedIn(let name) = state { return name }
        return nil
    }

    func refresh() async {
        guard let envelope = try? await APIClient.shared.currentSession(),
              envelope.user != nil else {
            state = .signedOut
            return
        }

        // /api/me carries the live username (the token can be stale after a
        // rename) and the suspension banner text.
        if let me = try? await APIClient.shared.me() {
            state = .signedIn(username: me.username ?? envelope.user?.username ?? "you")
            suspensionNotice = (me.suspended ?? false) ? me.suspendedReason : nil
        } else {
            state = .signedIn(username: envelope.user?.username ?? "you")
        }
    }

    func signIn(identifier: String, password: String) async throws {
        try await APIClient.shared.signIn(identifier: identifier, password: password)
        await refresh()
    }

    func signOut() async {
        await APIClient.shared.signOut()
        state = .signedOut
        suspensionNotice = nil
    }
}
