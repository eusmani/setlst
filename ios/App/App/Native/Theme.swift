import SwiftUI

/// SETLST's visual language, ported from the web app's Tailwind palette so the
/// native screens and the remaining web screens stay visually identical during
/// the migration.
enum Theme {
    // Backgrounds
    // Pitch black, not the web's #111111 — true black on OLED.
    static let background = Color(hex: 0x000000)
    static let surface = Color(hex: 0x1A1A1A)
    static let surfaceRaised = Color(hex: 0x222222)
    static let hairline = Color(hex: 0x1F1F1F)
    static let border = Color(hex: 0x2E2E2E)

    // Text
    static let primary = Color(hex: 0xF0F0F0)
    static let secondary = Color(hex: 0xA0A0A0)
    static let tertiary = Color(hex: 0x6B6B6B)

    // Brand
    static let accent = Color(hex: 0xC4A832)
    static let accentBright = Color(hex: 0xD4BA44)
    static let danger = Color(hex: 0xEF4444)

    /// Display face for headlines and the wordmark.
    ///
    /// Named `serif` because that's the web app's class name, but the web
    /// overrides `.font-serif` to Plus Jakarta Sans — a geometric sans, not a
    /// serif at all (see `globals.css`). Using an actual serif here is what made
    /// the native wordmark look wrong, so this loads the same bundled family.
    static func serif(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        // Font.Weight isn't Comparable, so match the heavy end explicitly.
        let heavy: Set<Font.Weight> = [.heavy, .black]
        let face = heavy.contains(weight) ? "PlusJakartaSans-ExtraBold" : "PlusJakartaSans-Bold"
        return .custom(face, size: size)
    }

    /// The SETLST wordmark, matching the web nav bar exactly:
    /// `font-serif text-3xl font-bold tracking-wide` — i.e. Plus Jakarta Sans at
    /// weight 700 (Bold, *not* ExtraBold), 30pt, 0.025em tracking.
    static let wordmarkSize: CGFloat = 30
    static let wordmarkLogoSize: CGFloat = 48   // w-12 h-12
    static let wordmarkGap: CGFloat = 8         // gap-2

    static func wordmark(_ size: CGFloat = wordmarkSize) -> Font {
        .custom("PlusJakartaSans-Bold", size: size)
    }

    /// Body and UI text. The whole web app runs on Plus Jakarta Sans
    /// (`globals.css` sets it on `body`), so native screens use it too rather
    /// than falling back to San Francisco — mixing the two is what made the
    /// native screens read as a different app.
    static func text(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold, .semibold, .heavy, .black:
            return .custom("PlusJakartaSans-Bold", size: size)
        default:
            return .custom("PlusJakartaSans-Regular", size: size)
        }
    }

    /// Section heading: `text-xl uppercase tracking-[0.15em]` in the web app.
    static func sectionHeading() -> Font { text(15, weight: .bold) }
    static let sectionTracking: CGFloat = 2.2

    /// Matching tracking for `wordmark(_:)`, in points for a given size.
    static func wordmarkTracking(_ size: CGFloat) -> CGFloat { size * 0.025 }

    /// Rating tiers — mirrors `src/lib/rating.ts` so a score reads the same on
    /// both platforms.
    static func ratingTier(_ rating: Double) -> (letter: String, word: String, color: Color) {
        switch rating {
        case 9.5...:   return ("A+", "MASTERPIECE", Color(hex: 0x4ADE80))
        case 9.0..<9.5:return ("A",  "ESSENTIAL",   Color(hex: 0x4ADE80))
        case 8.0..<9.0:return ("A-", "EXCELLENT",   Color(hex: 0x86EFAC))
        case 7.0..<8.0:return ("B",  "STRONG",      Color(hex: 0xC4A832))
        case 6.0..<7.0:return ("B-", "SOLID",       Color(hex: 0xD4BA44))
        case 5.0..<6.0:return ("C",  "MIXED",       Color(hex: 0xE0A458))
        case 4.0..<5.0:return ("C-", "WEAK",        Color(hex: 0xD98B5F))
        case 3.0..<4.0:return ("D",  "POOR",        Color(hex: 0xC96F6F))
        default:       return ("F",  "AVOID",       Color(hex: 0x9D6B6B))
        }
    }
}

extension Color {
    /// `Color(hex: 0xC4A832)` — matches how the palette is written in CSS.
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
