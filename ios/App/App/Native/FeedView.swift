import SwiftUI

/// The home feed, rebuilt natively: reviews from you and the people you follow.
/// First screen of the SwiftUI migration.
struct FeedView: View {
    @EnvironmentObject private var auth: AuthStore
    @State private var reviews: [Review] = []
    @State private var phase: Phase = .loading
    @State private var reportTarget: Review?

    private enum Phase { case loading, loaded, failed(String) }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .loading where reviews.isEmpty:
                    ProgressView().tint(Theme.accent)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                case .failed(let message) where reviews.isEmpty:
                    RetryNotice(message: message) { await load() }

                default:
                    if reviews.isEmpty {
                        EmptyFeedNotice()
                    } else {
                        List {
                            ForEach(reviews) { review in
                                ReviewRow(review: review) { reportTarget = review }
                                    .listRowBackground(Theme.background)
                                    .listRowSeparatorTint(Theme.hairline)
                                    .listRowInsets(.init(top: 12, leading: 16, bottom: 12, trailing: 16))
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("SETLST")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .refreshable { await load() }        // native pull-to-refresh
            .task { if reviews.isEmpty { await load() } }
            .sheet(item: $reportTarget) { review in
                ReportSheet(
                    contentType: "review",
                    contentId: review.id,
                    authorUsername: review.user.username,
                    label: "this review"
                )
            }
        }
        .tint(Theme.accent)
    }

    private func load() async {
        do {
            reviews = try await APIClient.shared.feed()
            phase = .loaded
        } catch {
            phase = .failed((error as? LocalizedError)?.errorDescription ?? "Something went wrong.")
        }
    }
}

// MARK: - Rows

private struct ReviewRow: View {
    let review: Review
    var onReport: () -> Void

    var body: some View {
        let tier = Theme.ratingTier(review.rating)

        HStack(alignment: .top, spacing: 12) {
            Artwork(url: review.album.artworkURL, size: 56)

            VStack(alignment: .leading, spacing: 6) {
                Text(review.album.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.primary)
                    .lineLimit(2)

                Text(review.album.artist)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.tertiary)

                Text(tier.word)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(tier.color)

                if let subject = review.subject, !subject.isEmpty {
                    Text(subject)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                }
                if let body = review.body, !body.isEmpty {
                    Text(body)
                        .font(.system(size: 14))
                        .foregroundStyle(Color(hex: 0xBBBBBB))
                        .lineLimit(3)
                }

                HStack(spacing: 6) {
                    Text("@\(review.user.username)")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.secondary)
                    Text("·").foregroundStyle(Theme.tertiary)
                    Text(review.createdAt, format: .dateTime.month(.abbreviated).day())
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.tertiary)
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 0)

            RatingBadge(tier: tier)
        }
        // Guideline 1.2: reporting reachable from every piece of content — here
        // as a native swipe action and context menu.
        .swipeActions(edge: .trailing) {
            Button("Report", systemImage: "flag") { onReport() }.tint(Theme.danger)
        }
        .contextMenu {
            Button("Report review", systemImage: "flag") { onReport() }
        }
    }
}

private struct RatingBadge: View {
    let tier: (letter: String, word: String, color: Color)

    var body: some View {
        Text(tier.letter)
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(tier.color)
            .frame(width: 36, height: 36)
            .background(Circle().fill(tier.color.opacity(0.1)))
            .overlay(Circle().stroke(tier.color, lineWidth: 2))
    }
}

private struct Artwork: View {
    let url: URL?
    let size: CGFloat

    var body: some View {
        AsyncImage(url: url) { image in
            image.resizable().aspectRatio(contentMode: .fill)
        } placeholder: {
            Rectangle().fill(Theme.surfaceRaised)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

// MARK: - Empty / error states

private struct EmptyFeedNotice: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "opticaldisc")
                .font(.system(size: 34))
                .foregroundStyle(Theme.tertiary)
            Text("Nothing here yet")
                .font(Theme.serif(20))
                .foregroundStyle(Theme.primary)
            Text("Log an album, or follow someone, and their reviews land here.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct RetryNotice: View {
    let message: String
    let retry: () async -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button("Try again") { Task { await retry() } }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(hex: 0x111111))
                .padding(.horizontal, 20).padding(.vertical, 10)
                .background(Capsule().fill(Theme.accent))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
