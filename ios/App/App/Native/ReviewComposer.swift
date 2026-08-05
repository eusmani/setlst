import SwiftUI

/// Rate and review an album, natively.
///
/// Ratings are 1–10 in half steps, matching the server's validation in
/// `POST /api/reviews` — the slider can't produce a value the API would reject.
/// Text goes through the server-side content filter, and a 422 comes back with a
/// human-readable reason, which is surfaced verbatim rather than replaced with
/// something generic.
struct ReviewComposer: View {
    let album: Album
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var rating: Double = 7
    @State private var subject = ""
    @State private var reviewText = ""
    @State private var favouriteSong = ""
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 12) {
                        AsyncImage(url: album.artworkURL) { $0.resizable().aspectRatio(contentMode: .fill) }
                            placeholder: { Rectangle().fill(Theme.surfaceRaised) }
                            .frame(width: 48, height: 48)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(album.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.primary)
                                .lineLimit(2)
                            Text(album.artist)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.tertiary)
                        }
                    }
                }
                .listRowBackground(Theme.surface)

                Section("Your rating") {
                    let tier = Theme.ratingTier(rating)
                    HStack {
                        Text(String(format: "%.1f", rating))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(tier.color)
                            .monospacedDigit()
                        Spacer()
                        Text(tier.word)
                            .font(.system(size: 12, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(tier.color)
                    }
                    // Half-steps, 1–10 — exactly what the API accepts.
                    Slider(value: $rating, in: 1...10, step: 0.5)
                        .tint(tier.color)
                }
                .listRowBackground(Theme.surface)

                Section("Review") {
                    TextField("Headline (optional)", text: $subject)
                        .foregroundStyle(Theme.primary)
                    TextField("What did you think?", text: $reviewText, axis: .vertical)
                        .lineLimit(4...10)
                        .foregroundStyle(Theme.primary)
                    TextField("Favourite track (optional)", text: $favouriteSong)
                        .foregroundStyle(Theme.primary)
                }
                .listRowBackground(Theme.surface)

                if let error {
                    Section {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.danger)
                    }
                    .listRowBackground(Theme.surface)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Log album")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.tint(Theme.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(saving)
                        .tint(Theme.accent)
                }
            }
        }
        .tint(Theme.accent)
    }

    private func save() async {
        saving = true
        error = nil

        var payload: [String: Any] = [
            "spotifyId": album.spotifyId,
            "title": album.title,
            "artist": album.artist,
            "rating": rating,
        ]
        if let artwork = album.artwork { payload["artwork"] = artwork }
        if let year = album.year { payload["year"] = year }
        if !subject.isEmpty { payload["subject"] = subject }
        if !reviewText.isEmpty { payload["body"] = reviewText }
        if !favouriteSong.isEmpty { payload["favoriteSong"] = favouriteSong }

        do {
            struct Saved: Decodable { let id: String }
            _ = try await APIClient.shared.post("/api/reviews", json: payload, as: Saved.self)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            onSaved()
            dismiss()
        } catch {
            // A 422 here is the content filter; its message explains why.
            self.error = (error as? LocalizedError)?.errorDescription ?? "Couldn't save that review."
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        saving = false
    }
}
