import SwiftUI
import UIKit
import Capacitor

/// Hosts the Capacitor web view inside SwiftUI, for the screens that haven't been
/// rewritten natively yet.
///
/// This is the migration seam. Each screen that moves to SwiftUI drops out of
/// here; when the last one does, this file and the Capacitor dependency go with
/// it. Crucially there is exactly ONE bridge view controller for the whole app —
/// spinning up a second would mean a second web view, a second Capacitor bridge,
/// and duplicate plugin registrations.
final class WebHost {
    static let shared = WebHost()

    /// Built from Main.storyboard so it keeps the project's configured
    /// `MainViewController` subclass (edge-swipe gestures, plugin registration).
    lazy var controller: UIViewController = {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        return storyboard.instantiateInitialViewController() ?? CAPBridgeViewController()
    }()

    /// Read a localStorage value out of the embedded web app.
    ///
    /// The onboarding wizard lives on the web and records completion in
    /// localStorage (`setlst_onboarded_v1`), so that flag is the source of truth
    /// for whether onboarding has been seen — reading it here avoids the native
    /// and web halves disagreeing about first-launch state.
    @MainActor
    func localStorageValue(_ key: String) async -> String? {
        guard let bridgeVC = controller as? CAPBridgeViewController,
              let webView = bridgeVC.webView else { return nil }
        let escaped = key.replacingOccurrences(of: "'", with: "\\'")
        let result = try? await webView.evaluateJavaScript("localStorage.getItem('\(escaped)')")
        return result as? String
    }

    /// Navigate the embedded web app without reloading the whole bridge.
    func navigate(to path: String) {
        guard let bridgeVC = controller as? CAPBridgeViewController,
              let webView = bridgeVC.webView else { return }
        let escaped = path.replacingOccurrences(of: "'", with: "\\'")
        // Prefer the SPA router so navigation keeps client state; fall back to a
        // location change if the app hasn't booted yet.
        webView.evaluateJavaScript(
            "(window.next?.router?.push ?? ((p) => { window.location.href = p; }))('\(escaped)')",
            completionHandler: nil
        )
    }
}

struct WebScreen: UIViewControllerRepresentable {
    /// Path to show when the tab is first opened.
    var path: String?

    func makeUIViewController(context: Context) -> UIViewController {
        WebHost.shared.controller
    }

    func updateUIViewController(_ controller: UIViewController, context: Context) {
        if let path { WebHost.shared.navigate(to: path) }
    }
}
