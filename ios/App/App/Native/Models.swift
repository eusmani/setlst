import Foundation

/// Codable mirrors of the JSON returned by the Next.js API routes.
///
/// The API hands back Prisma rows more or less verbatim, so these match the
/// Prisma models in `prisma/schema.prisma`. Dates arrive as ISO-8601 strings.

struct UserLite: Codable, Identifiable, Hashable {
    let id: String
    let username: String
    let avatar: String?
    var bio: String?
}

struct Album: Codable, Identifiable, Hashable {
    let id: String
    let spotifyId: String
    let title: String
    let artist: String
    let artwork: String?
    let year: Int?

    var artworkURL: URL? {
        guard let artwork, !artwork.isEmpty else { return nil }
        return URL(string: artwork)
    }
}

struct Review: Codable, Identifiable, Hashable {
    let id: String
    let rating: Double
    let subject: String?
    let body: String?
    let favoriteSong: String?
    let leastFavoriteSong: String?
    let showSongs: Bool?
    let createdAt: Date
    let user: UserLite
    let album: Album

    /// `_count: { likes }` — the underscore makes this awkward, hence the key.
    private let count: Count?
    var likeCount: Int { count?.likes ?? 0 }

    struct Count: Codable, Hashable { let likes: Int }

    enum CodingKeys: String, CodingKey {
        case id, rating, subject, body, favoriteSong, leastFavoriteSong
        case showSongs, createdAt, user, album
        case count = "_count"
    }
}

/// The signed-in user, from `/api/me`.
struct Me: Codable {
    let username: String?
    let avatar: String?
    let suspended: Bool?
    let suspendedReason: String?
}

/// `/api/auth/session` — used to tell whether the cookie jar holds a live session.
struct SessionEnvelope: Codable {
    struct SessionUser: Codable {
        let name: String?
        let email: String?
        let username: String?
    }
    let user: SessionUser?
}

// MARK: - Date decoding

extension JSONDecoder {
    /// Decoder configured for this API: ISO-8601 with fractional seconds, which
    /// is what Prisma/`toISOString()` produces.
    static var setlst: JSONDecoder {
        let decoder = JSONDecoder()
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]

        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            if let date = withFraction.date(from: raw) ?? plain.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Unrecognised date: \(raw)")
            )
        }
        return decoder
    }
}
