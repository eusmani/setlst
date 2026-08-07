import AppIntents
import UIKit

// Siri / Spotlight / Shortcuts entry points (App Store guideline 4.2).
//
// These put SETLST into places a web page cannot reach: the Shortcuts app, the
// Action Button, Spotlight search, and "Hey Siri, log an album on SETLST".
// Each opens the app and routes it to the right screen, reusing the same pending
// route mechanism the Home Screen quick actions use.

/// Where an intent wants the web layer to go once the app is open.
enum IntentRoute {
    static var pending: String?

    /// Hand the route to JavaScript, or hold it until JavaScript asks.
    static func go(_ path: String) {
        if let plugin = QuickActionsPlugin.current {
            plugin.notifyListeners("quickAction", data: ["route": path])
        } else {
            pending = path
        }
    }
}

struct LogAlbumIntent: AppIntent {
    static var title: LocalizedStringResource = "Log an album"
    static var description = IntentDescription("Open SETLST to rate an album you've just listened to.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        IntentRoute.go("/log")
        return .result()
    }
}

struct SearchAlbumsIntent: AppIntent {
    static var title: LocalizedStringResource = "Search albums"
    static var description = IntentDescription("Search the SETLST album catalogue.")
    static var openAppWhenRun = true

    @Parameter(title: "Album or artist")
    var query: String?

    @MainActor
    func perform() async throws -> some IntentResult {
        if let query, !query.isEmpty,
           let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            IntentRoute.go("/search?q=\(encoded)")
        } else {
            IntentRoute.go("/search")
        }
        return .result()
    }
}

struct OpenDiaryIntent: AppIntent {
    static var title: LocalizedStringResource = "Open my diary"
    static var description = IntentDescription("See the albums you've recently logged.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        IntentRoute.go("/activity?tab=you&only=you")
        return .result()
    }
}

/// Phrases Siri and Spotlight offer without the user configuring anything.
struct SetlstShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogAlbumIntent(),
            phrases: [
                "Log an album on \(.applicationName)",
                "Rate an album on \(.applicationName)",
                "Add an album to \(.applicationName)",
            ],
            shortTitle: "Log an album",
            systemImageName: "plus.circle"
        )
        AppShortcut(
            intent: SearchAlbumsIntent(),
            phrases: [
                "Search albums on \(.applicationName)",
                "Find an album on \(.applicationName)",
            ],
            shortTitle: "Search albums",
            systemImageName: "magnifyingglass"
        )
        AppShortcut(
            intent: OpenDiaryIntent(),
            phrases: [
                "Open my diary on \(.applicationName)",
                "Show my \(.applicationName) diary",
            ],
            shortTitle: "Your diary",
            systemImageName: "book"
        )
    }
}
