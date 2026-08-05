import SwiftUI

/// SETLST's visual language, ported from the web app's Tailwind palette so the
/// native screens and the remaining web screens stay visually identical during
/// the migration.
enum Theme {
    // Backgrounds
    static let background = Color(hex: 0x111111)
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

    /// Serif display face used for headlines on the web app.
    static func serif(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }

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
