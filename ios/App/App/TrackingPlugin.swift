import Foundation
import Capacitor
import AppTrackingTransparency
import AdSupport

/// App Tracking Transparency.
///
/// The Flutter equivalent of this is one call to `app_tracking_transparency`.
/// There's no such package here — this app is a Capacitor shell — so the two
/// system frameworks are wrapped directly and exposed to the web layer.
///
/// Two things worth knowing before this is used:
///
/// 1. The prompt can only ever be shown once per install. iOS answers from the
///    stored decision every time after, so calling it at launch spends the one
///    chance you get on a moment when nobody knows what they're agreeing to.
///    Ask when there's something to explain — the first time an ad would load.
///
/// 2. Requesting authorization is what makes an app "tracking" in Apple's terms.
///    SETLST currently declares NSPrivacyTracking = false in its privacy
///    manifest and answers "not used to track" in App Store Connect, so calling
///    this without changing both is a contradiction App Review does check for.
@objc(TrackingPlugin)
public class TrackingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TrackingPlugin"
    public let jsName = "SetlstTracking"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    /// The advertising identifier, or nil when it isn't ours to read.
    ///
    /// Without authorization iOS returns all zeros rather than failing, which is
    /// easy to mistake for a real id — so that case is reported as nil.
    private func advertisingIdentifier() -> String? {
        guard #available(iOS 14, *), ATTrackingManager.trackingAuthorizationStatus == .authorized else {
            return nil
        }
        let idfa = ASIdentifierManager.shared().advertisingIdentifier.uuidString
        return idfa == "00000000-0000-0000-0000-000000000000" ? nil : idfa
    }

    private func name(for status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .authorized:     return "authorized"
        case .denied:         return "denied"
        case .restricted:     return "restricted"   // blocked by policy, can't be asked
        case .notDetermined:  return "notDetermined"
        @unknown default:     return "unknown"
        }
    }

    /// Present the system prompt, or return the existing decision if there is one.
    @objc func request(_ call: CAPPluginCall) {
        guard #available(iOS 14, *) else {
            // Before iOS 14 there was no prompt and the IDFA was available
            // outright, so report it as already granted.
            call.resolve(["status": "authorized", "idfa": ASIdentifierManager.shared().advertisingIdentifier.uuidString])
            return
        }

        ATTrackingManager.requestTrackingAuthorization { [weak self] status in
            guard let self else { return }
            // The completion arrives on an arbitrary queue; the bridge expects
            // to be resolved on the main thread.
            DispatchQueue.main.async {
                call.resolve([
                    "status": self.name(for: status),
                    "idfa": self.advertisingIdentifier() as Any,
                ])
            }
        }
    }

    /// The current decision, without ever showing the prompt.
    @objc func status(_ call: CAPPluginCall) {
        guard #available(iOS 14, *) else {
            call.resolve(["status": "authorized", "idfa": ASIdentifierManager.shared().advertisingIdentifier.uuidString])
            return
        }
        call.resolve([
            "status": name(for: ATTrackingManager.trackingAuthorizationStatus),
            "idfa": advertisingIdentifier() as Any,
        ])
    }
}
