import Foundation
import Capacitor
import WidgetKit
import UIKit

/// Feeds the Home Screen widget.
///
/// The widget has no session of its own, so it can't fetch anything — the app
/// writes what it should show into the shared App Group container after each
/// feed load, and nudges WidgetKit to reload. Artwork is downloaded and stored
/// as data rather than a URL, because the widget process may well run with no
/// network at all.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setRecentAlbums", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeSharedAlbum", returnType: CAPPluginReturnPromise)
    ]

    private static let appGroup = "group.app.setlst.native"
    private static let payloadKey = "widget.recentAlbums"

    private struct RecentAlbum: Codable {
        let title: String
        let artist: String
        let grade: String?
        let artworkData: Data?
    }

    /// `setRecentAlbums({ albums: [{ title, artist, grade, artwork }] })`
    @objc func setRecentAlbums(_ call: CAPPluginCall) {
        let incoming = call.getArray("albums", JSObject.self) ?? []

        Task {
            var payload: [RecentAlbum] = []

            for item in incoming.prefix(4) {
                let title = item["title"] as? String ?? ""
                let artist = item["artist"] as? String ?? ""
                let grade = item["grade"] as? String
                var artwork: Data?

                if let urlString = item["artwork"] as? String, let url = URL(string: urlString) {
                    // Small enough to sit in a shared container comfortably;
                    // the widget renders it at 64pt.
                    artwork = try? await Self.downloadThumbnail(url)
                }

                payload.append(RecentAlbum(title: title, artist: artist, grade: grade, artworkData: artwork))
            }

            if let defaults = UserDefaults(suiteName: Self.appGroup),
               let encoded = try? JSONEncoder().encode(payload) {
                defaults.set(encoded, forKey: Self.payloadKey)
            }

            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["ok": true, "count": payload.count])
        }
    }

    /// Anything the share extension dropped in the shared container — a title
    /// or link shared from Music, Spotify or Safari — returned once and cleared.
    @objc func consumeSharedAlbum(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: Self.appGroup)
        let query = defaults?.string(forKey: "share.pendingQuery")
        defaults?.removeObject(forKey: "share.pendingQuery")
        call.resolve(["query": query as Any])
    }

    /// Downsamples to keep the App Group container small — full-size covers are
    /// ~600px and there's no need for that at widget scale.
    private static func downloadThumbnail(_ url: URL) async throws -> Data? {
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let image = UIImage(data: data) else { return nil }
        let side: CGFloat = 180
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side))
        let resized = renderer.image { _ in
            image.draw(in: CGRect(x: 0, y: 0, width: side, height: side))
        }
        return resized.jpegData(compressionQuality: 0.8)
    }
}
