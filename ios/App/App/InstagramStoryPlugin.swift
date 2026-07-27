import Foundation
import Capacitor
import UIKit

/// Posts a review card straight into the Instagram Stories composer.
///
/// Instagram's documented iOS handoff is a pasteboard drop plus a URL scheme:
/// you put the sticker / background under the `com.instagram.sharedSticker.*`
/// keys, then open `instagram-stories://share`. Instagram reads the pasteboard,
/// opens its composer with the artwork already placed, and the user publishes
/// from there — the same flow Spotify and Letterboxd use. Nothing is posted on
/// the user's behalf and no Instagram login happens inside SETLST.
///
/// `source_application` is the Meta app ID the web layer passes through; without
/// one Instagram still opens, it just can't attribute the story back to SETLST.
@objc(InstagramStoryPlugin)
public class InstagramStoryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoryPlugin"
    public let jsName = "InstagramStory"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)
    ]

    private static let storiesScheme = "instagram-stories://share"
    /// Instagram drops anything older than this, and we don't want a review card
    /// lingering on the pasteboard afterwards.
    private static let pasteboardTTL: TimeInterval = 5 * 60

    // MARK: - Availability

    @objc func isAvailable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["available": self.instagramInstalled()])
        }
    }

    // MARK: - Story handoff

    @objc func shareToStory(_ call: CAPPluginCall) {
        let appID = (call.getString("appID") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        var item: [String: Any] = [:]
        if let sticker = decodeImage(call.getString("stickerImage")) {
            item["com.instagram.sharedSticker.stickerImage"] = sticker
        }
        if let background = decodeImage(call.getString("backgroundImage")) {
            item["com.instagram.sharedSticker.backgroundImage"] = background
        }
        if let top = call.getString("backgroundTopColor") {
            item["com.instagram.sharedSticker.backgroundTopColor"] = top
        }
        if let bottom = call.getString("backgroundBottomColor") {
            item["com.instagram.sharedSticker.backgroundBottomColor"] = bottom
        }
        // Renders as a tappable link sticker for Meta apps that are allowed to
        // attach one; Instagram simply ignores it otherwise.
        if let link = call.getString("contentURL"), !link.isEmpty {
            item["com.instagram.sharedSticker.contentURL"] = link
        }
        if !appID.isEmpty {
            item["com.instagram.sharedSticker.appID"] = appID
        }

        guard item["com.instagram.sharedSticker.stickerImage"] != nil
                || item["com.instagram.sharedSticker.backgroundImage"] != nil else {
            call.reject("A stickerImage or backgroundImage is required", "NO_IMAGE")
            return
        }

        let target = appID.isEmpty
            ? Self.storiesScheme
            : "\(Self.storiesScheme)?source_application=\(appID)"

        DispatchQueue.main.async {
            guard let url = URL(string: target), self.instagramInstalled() else {
                call.reject("Instagram is not installed", "UNAVAILABLE")
                return
            }
            UIPasteboard.general.setItems(
                [item],
                options: [.expirationDate: Date().addingTimeInterval(Self.pasteboardTTL)]
            )
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("Could not open Instagram", "OPEN_FAILED")
                }
            }
        }
    }

    // MARK: - System share sheet (used when Instagram isn't installed)

    @objc func shareImage(_ call: CAPPluginCall) {
        guard let data = decodeImage(call.getString("image")), let image = UIImage(data: data) else {
            call.reject("An image is required", "NO_IMAGE")
            return
        }
        let title = call.getString("title")

        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present from", "NO_PRESENTER")
                return
            }
            var activityItems: [Any] = [image]
            if let title, !title.isEmpty { activityItems.append(title) }

            let sheet = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
            // iPad presents this as a popover and crashes without an anchor.
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(
                    x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0
                )
                popover.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["completed": completed])
            }
            presenter.present(sheet, animated: true)
        }
    }

    // MARK: - Helpers

    private func instagramInstalled() -> Bool {
        guard let url = URL(string: Self.storiesScheme) else { return false }
        return UIApplication.shared.canOpenURL(url)
    }

    /// Accepts either a bare base64 string or a `data:image/png;base64,…` URL.
    private func decodeImage(_ value: String?) -> Data? {
        guard var encoded = value, !encoded.isEmpty else { return nil }
        if let comma = encoded.range(of: ","), encoded.hasPrefix("data:") {
            encoded = String(encoded[comma.upperBound...])
        }
        return Data(base64Encoded: encoded, options: .ignoreUnknownCharacters)
    }
}
