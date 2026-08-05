import Foundation

/// Talks to the SETLST Next.js API.
///
/// Auth is next-auth's credentials flow, which is cookie-based: fetch a CSRF
/// token, POST it with the credentials to the callback endpoint, and the session
/// cookie lands in shared storage. `URLSession` is configured with
/// `HTTPCookieStorage.shared`, which is the same jar `WKWebView` uses via
/// `WKWebsiteDataStore.default()`, so a session established natively is also
/// valid on the web screens still rendered in the web view — and vice versa.
/// That shared cookie jar is what lets the native and web halves coexist during
/// the migration.
actor APIClient {
    static let shared = APIClient()

    static let baseURL = URL(string: "https://setlst.dev")!

    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = .shared
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        config.requestCachePolicy = .reloadRevalidatingCacheData
        config.timeoutIntervalForRequest = 20
        session = URLSession(configuration: config)
    }

    enum APIError: LocalizedError {
        case http(Int, String?)
        case transport(String)
        case decoding(String)

        var errorDescription: String? {
            switch self {
            case .http(let code, let message):
                return message ?? "The server returned an error (\(code))."
            case .transport:
                return "Couldn't reach SETLST. Check your connection."
            case .decoding:
                return "SETLST sent something unexpected."
            }
        }
    }

    /// Server-supplied `{ "error": "..." }` bodies, surfaced verbatim — the API
    /// returns human-readable messages (content-filter rejections, blocks,
    /// suspensions) that are better than anything generic we'd invent.
    private struct ErrorBody: Decodable { let error: String? }

    // MARK: - Requests

    func get<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        try await send(request(path), as: type)
    }

    @discardableResult
    func post<T: Decodable>(_ path: String, json: [String: Any], as type: T.Type) async throws -> T {
        var req = request(path)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: json)
        return try await send(req, as: type)
    }

    private func request(_ path: String) -> URLRequest {
        var req = URLRequest(url: URL(string: path, relativeTo: Self.baseURL)!)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        return req
    }

    private func send<T: Decodable>(_ req: URLRequest, as: T.Type) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error.localizedDescription)
        }

        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let message = try? JSONDecoder().decode(ErrorBody.self, from: data).error
            throw APIError.http(code, message)
        }

        do {
            return try JSONDecoder.setlst.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }

    // MARK: - Auth

    private struct CSRF: Decodable { let csrfToken: String }

    /// Signs in with the credentials provider. `identifier` is an email,
    /// username, or phone number — the same field the web form posts.
    func signIn(identifier: String, password: String) async throws {
        let csrf = try await get("/api/auth/csrf", as: CSRF.self)

        var req = request("/api/auth/callback/credentials")
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var components = URLComponents()
        components.queryItems = [
            .init(name: "csrfToken", value: csrf.csrfToken),
            .init(name: "identifier", value: identifier),
            .init(name: "password", value: password),
            .init(name: "callbackUrl", value: Self.baseURL.absoluteString),
            .init(name: "json", value: "true"),
        ]
        req.httpBody = components.percentEncodedQuery?.data(using: .utf8)

        // next-auth answers with a redirect whose body isn't JSON we care about;
        // what matters is whether a session cookie results.
        _ = try? await session.data(for: req)

        guard try await currentSession()?.user != nil else {
            throw APIError.http(401, "That username or password isn't right.")
        }
    }

    func currentSession() async throws -> SessionEnvelope? {
        try? await get("/api/auth/session", as: SessionEnvelope.self)
    }

    func signOut() async {
        // Clear the shared jar so the web screens are signed out too.
        if let cookies = HTTPCookieStorage.shared.cookies(for: Self.baseURL) {
            for cookie in cookies { HTTPCookieStorage.shared.deleteCookie(cookie) }
        }
    }

    // MARK: - Endpoints

    func feed() async throws -> [Review] {
        try await get("/api/feed", as: [Review].self)
    }

    func me() async throws -> Me {
        try await get("/api/me", as: Me.self)
    }

    func reviews(albumId: String) async throws -> [Review] {
        try await get("/api/reviews?albumId=\(albumId)", as: [Review].self)
    }

    // MARK: Search

    /// `/api/spotify/search` answers in the catalogue provider's own shape
    /// (`name`, `artists[]`, `images[]`, `release_date`), not our Album shape,
    /// so it's decoded separately and mapped. These results aren't in our
    /// database yet — a row is created when someone first reviews the album —
    /// so `id` is set to the catalogue id.
    private struct AlbumSearchResponse: Decodable {
        struct Hit: Decodable {
            struct Artist: Decodable { let name: String }
            struct Image: Decodable { let url: String }
            let id: String
            let name: String
            let artists: [Artist]?
            let images: [Image]?
            let release_date: String?
        }
        let results: [Hit]
    }

    func searchAlbums(_ term: String) async throws -> [Album] {
        let encoded = term.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? term
        let response = try await get("/api/spotify/search?q=\(encoded)", as: AlbumSearchResponse.self)
        return response.results.map { hit in
            Album(
                id: hit.id,
                spotifyId: hit.id,
                title: hit.name,
                artist: hit.artists?.first?.name ?? "Unknown artist",
                artwork: hit.images?.first?.url,
                // release_date is "1997-05-28" or just "1997".
                year: hit.release_date.flatMap { Int($0.prefix(4)) }
            )
        }
    }

    func searchPeople(_ term: String) async throws -> [UserLite] {
        let encoded = term.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? term
        return try await get("/api/users/search?q=\(encoded)", as: [UserLite].self)
    }

    /// Files a report (guideline 1.2). Mirrors `POST /api/report`.
    func report(contentType: String, contentId: String, reason: String, details: String?) async throws {
        struct Ack: Decodable { let ok: Bool? }
        var body: [String: Any] = [
            "contentType": contentType, "contentId": contentId, "reason": reason,
        ]
        if let details, !details.isEmpty { body["details"] = details }
        _ = try await post("/api/report", json: body, as: Ack.self)
    }

    /// Blocks a member (guideline 1.2). Mirrors `POST /api/block`.
    func block(username: String) async throws {
        struct Ack: Decodable { let blocked: Bool? }
        _ = try await post("/api/block", json: ["username": username], as: Ack.self)
    }
}
