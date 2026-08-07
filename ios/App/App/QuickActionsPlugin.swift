import Foundation
import UIKit
import Capacitor

/// Home Screen quick actions — the shortcuts that appear when you long-press the
/// SETLST icon (App Store guideline 4.2: functionality a web page cannot provide).
///
/// The items themselves are declared statically in Info.plist under
/// `UIApplicationShortcutItems`. This plugin's job is routing: when the app is
/// launched or resumed by one of them, the chosen shortcut's `type` is handed to
/// the web layer, which navigates to the matching screen.
///
/// A shortcut can arrive before the web view is listening (cold launch), so the
/// pending type is held here and replayed as soon as JavaScript registers.
@objc(QuickActionsPlugin)
public class QuickActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuickActionsPlugin"
    public let jsName = "QuickActions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consumePending", returnType: CAPPluginReturnPromise)
    ]

    /// Set by the app delegate before the bridge exists; drained by `consumePending`.
    public static var pendingType: String?

    /// A concrete path, used by App Intents (Siri / Spotlight / Shortcuts),
    /// which know exactly where they want to land rather than a shortcut id.
    public static var pendingRoute: String?

    /// Live instance, so a shortcut used while the app is already running can be
    /// delivered immediately rather than waiting for the next `consumePending`.
    public static weak var current: QuickActionsPlugin?

    override public func load() {
        QuickActionsPlugin.current = self
    }

    /// Called by the app delegate when a shortcut is chosen.
    public static func handle(_ type: String) {
        if let plugin = current {
            plugin.notifyListeners("quickAction", data: ["type": type])
        } else {
            pendingType = type
        }
    }

    /// Returns whatever launched the app — a shortcut id, a route, or neither —
    /// and clears it.
    @objc func consumePending(_ call: CAPPluginCall) {
        let type = QuickActionsPlugin.pendingType
        let route = QuickActionsPlugin.pendingRoute ?? IntentRoute.pending
        QuickActionsPlugin.pendingType = nil
        QuickActionsPlugin.pendingRoute = nil
        IntentRoute.pending = nil
        call.resolve(["type": type as Any, "route": route as Any])
    }
}
