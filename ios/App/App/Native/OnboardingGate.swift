import SwiftUI

/// First-launch onboarding.
///
/// The slideshow and sign-up wizard still live on the web
/// (`OnboardingSlideshow.tsx`), and deliberately so: that flow is where EULA
/// acceptance is collected and recorded (App Store guideline 1.2). Duplicating
/// it natively is how signup got broken once already, so this hosts the real one
/// rather than reimplementing it.
///
/// It watches two signals to know when to hand off to the native app:
///
///  * a session appearing — the user signed up or signed in inside the wizard;
///  * the web's own `setlst_onboarded_v1` localStorage flag — the user tapped
///    Skip, so onboarding is done even though they're still signed out.
///
/// Using the web's flag as the source of truth keeps the two halves from
/// disagreeing about whether onboarding has been seen.
struct OnboardingGate: View {
    @EnvironmentObject private var auth: AuthStore

    /// Set once onboarding is finished, so it never shows again.
    @AppStorage("setlst.onboardingSeen") private var seen = false

    /// Completed onboarding but chose not to sign in — show native sign-in.
    @State private var finishedSignedOut = false

    private static let webSeenKey = "setlst_onboarded_v1"

    var body: some View {
        Group {
            if seen || finishedSignedOut {
                SignInView()
            } else {
                WebScreen(path: "/")
                    .ignoresSafeArea()
                    .task { await watchForCompletion() }
            }
        }
    }

    /// Polls rather than bridging an event out of the web view: the wizard has
    /// several exits (sign up, sign in, skip, connect-Spotify round trip), and
    /// polling catches all of them without adding a message handler the web side
    /// would have to know about.
    private func watchForCompletion() async {
        while !Task.isCancelled && !seen && !finishedSignedOut {
            try? await Task.sleep(for: .seconds(1.5))
            guard !Task.isCancelled else { return }

            await auth.refresh()
            if case .signedIn = auth.state {
                seen = true
                return
            }

            if await WebHost.shared.localStorageValue(Self.webSeenKey) != nil {
                // Skipped: onboarding is done, but there's no session yet.
                seen = true
                finishedSignedOut = true
                return
            }
        }
    }
}
