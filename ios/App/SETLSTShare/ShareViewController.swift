import UIKit
import UniformTypeIdentifiers
import Social

// Share extension (App Store guideline 4.2).
//
// Puts SETLST in the system share sheet, so an album shared from Apple Music,
// Spotify or Safari can be logged without opening the app and searching for it
// by hand. A web page cannot register as a share destination — this only exists
// because there's a native extension.
//
// The extension deliberately does no networking of its own: it extracts a title
// or URL, hands it to the app through the shared App Group, and the app picks it
// up on next launch. That keeps it fast, keeps session handling in one place,
// and means it works when the extension has no network.
class ShareViewController: UIViewController {
    private let appGroup = "group.app.setlst.native"
    private let pendingKey = "share.pendingQuery"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.067, green: 0.067, blue: 0.067, alpha: 1)
        handleInput()
    }

    private func handleInput() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments, !providers.isEmpty else {
            return finish(with: nil)
        }

        // Prefer a URL (Apple Music / Spotify links carry the album), then plain
        // text, then whatever title the host supplied.
        let group = DispatchGroup()
        var found: String?

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { value, _ in
                    if found == nil, let url = value as? URL { found = url.absoluteString }
                    group.leave()
                }
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { value, _ in
                    if found == nil, let text = value as? String { found = text }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.finish(with: found ?? item.attributedContentText?.string)
        }
    }

    private func finish(with raw: String?) {
        if let query = raw.flatMap(Self.searchTerm), !query.isEmpty,
           let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(query, forKey: pendingKey)
        }
        extensionContext?.completeRequest(returningItems: nil) { _ in }
    }

    /// Turns a shared payload into something worth searching for. Streaming
    /// links carry the album name in the path, which is a better search term
    /// than the raw URL.
    static func searchTerm(from raw: String) -> String? {
        guard let url = URL(string: raw), url.scheme?.hasPrefix("http") == true else {
            return raw.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        let host = url.host ?? ""
        if host.contains("music.apple.com") || host.contains("open.spotify.com") {
            // …/album/in-rainbows/1109714933 → "in rainbows"
            let parts = url.pathComponents.filter { $0 != "/" && $0 != "album" }
            if let slug = parts.first(where: { $0.rangeOfCharacter(from: .letters) != nil }) {
                return slug.replacingOccurrences(of: "-", with: " ")
            }
        }
        return url.absoluteString
    }
}
