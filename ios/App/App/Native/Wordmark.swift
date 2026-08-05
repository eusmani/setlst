import SwiftUI

/// The SETLST lockup — turntable mark plus wordmark — matching the web nav bar.
///
/// The nav bar renders it as `font-serif text-3xl font-bold tracking-wide` with
/// a `w-12 h-12` logo and `gap-2`. `.font-serif` is overridden to Plus Jakarta
/// Sans in globals.css, so this uses the bundled Jakarta at weight 700 rather
/// than an actual serif. Kept in one place so the native screens can't drift
/// from the web.
struct Wordmark: View {
    var size: CGFloat = Theme.wordmarkSize
    var color: Color = Theme.primary

    /// Logo and tracking scale with the type, so a larger lockup stays in proportion.
    private var scale: CGFloat { size / Theme.wordmarkSize }

    var body: some View {
        HStack(spacing: Theme.wordmarkGap * scale) {
            Image("TurntableLogo")
                .resizable()
                .scaledToFit()
                .frame(width: Theme.wordmarkLogoSize * scale,
                       height: Theme.wordmarkLogoSize * scale)
            Text("SETLST")
                .font(Theme.wordmark(size))
                .tracking(Theme.wordmarkTracking(size))
                .foregroundStyle(color)
        }
    }
}
