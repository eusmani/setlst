import SwiftUI

/// An album and everything written about it. Second screen of the SwiftUI
/// migration, and the other half of the app's core loop with `ReviewComposer`.
struct AlbumDetailView: View {
    let album: Album

    @State private var reviews: [Review] = []
    @State private var loading = true
    @State private var composing = false
    @State private var reportTarget: Review?

    private var averageRating: Double? {
        guard !reviews.isEmpty else { return nil }
        return reviews.map(\.rating).reduce(0, +) / Double(reviews.count)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header

                Button {
                    composing = true
                } label: {
                    Label("Log this album", systemImage: "plus.circle.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.accent))
                        .foregroundStyle(Color(hex: 0x1A1408))
                }
                .padding(.horizontal, 16)

                reviewsSection
            }
            .padding(.vertical, 16)
        }
        .background(Theme.background)
        .navigationTitle(album.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $composing) {
            ReviewComposer(album: album) { Task { await load() } }
        }
        .sheet(item: $reportTarget) { review in
            ReportSheet(
                contentType: "review",
                contentId: review.id,
                authorUsername: review.user.username,
                label: "this review"
            )
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 14) {
            AsyncImage(url: album.artworkURL) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle().fill(Theme.surfaceRaised)
            }
            .frame(width: 108, height: 108)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 5) {
                Text(album.title)
                    .font(Theme.serif(21))
                    .foregroundStyle(Theme.primary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(album.artist)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.secondary)
                if let year = album.year {
                    Text(String(year))
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.tertiary)
                }
                if let average = averageRating {
                    let tier = Theme.ratingTier(average)
                    HStack(spacing: 6) {
                        Text(tier.letter)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(tier.color)
                        Text(String(format: "%.1f · %d review%@", average, reviews.count,
                                    reviews.count == 1 ? "" : "s"))
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.tertiary)
                    }
                    .padding(.top, 3)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("REVIEWS")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(Theme.tertiary)
                .padding(.horizontal, 16)

            if loading && reviews.isEmpty {
                ProgressView().tint(Theme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else if reviews.isEmpty {
                Text("No one's reviewed this yet. Be the first.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.secondary)
                    .padding(.horizontal, 16)
            } else {
                ForEach(reviews) { review in
                    AlbumReviewCard(review: review) { reportTarget = review }
                        .padding(.horizontal, 16)
                }
            }
        }
    }

    private func load() async {
        loading = true
        reviews = (try? await APIClient.shared.reviews(albumId: album.spotifyId)) ?? []
        loading = false
    }
}

private struct AlbumReviewCard: View {
    let review: Review
    var onReport: () -> Void

    var body: some View {
        let tier = Theme.ratingTier(review.rating)

        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("@\(review.user.username)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.secondary)
                Spacer()
                Text(tier.letter)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(tier.color)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Capsule().fill(tier.color.opacity(0.12)))
            }

            if let subject = review.subject, !subject.isEmpty {
                Text(subject)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.primary)
            }
            if let body = review.body, !body.isEmpty {
                Text(body)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(hex: 0xBBBBBB))
            }

            Text(review.createdAt, format: .dateTime.month(.abbreviated).day().year())
                .font(.system(size: 11))
                .foregroundStyle(Theme.tertiary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.hairline))
        // Guideline 1.2 — reporting reachable wherever content is shown.
        .contextMenu {
            Button("Report review", systemImage: "flag") { onReport() }
        }
    }
}
