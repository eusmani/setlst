import SwiftUI

/// The home screen, rebuilt to match the web app rather than the plain list the
/// first migration pass shipped: album-wall header, "Welcome back", the
/// Recent / This week / Upcoming release pills with a horizontal rail, then
/// friends' activity.
struct HomeView: View {
    @EnvironmentObject private var auth: AuthStore

    @State private var releases: [Release] = []
    @State private var releaseFilter: ReleaseFilter = .week
    @State private var activity: [Review] = []
    @State private var loadingActivity = true
    @State private var reportTarget: Review?

    enum ReleaseFilter: String, CaseIterable, Identifiable {
        case recent, week, upcoming
        var id: String { rawValue }
        var label: String {
            switch self {
            case .recent: return "Recent"
            case .week: return "This week"
            case .upcoming: return "Upcoming"
            }
        }
        var query: String {
            switch self {
            case .recent: return "/api/releases?range=recent"
            case .week: return "/api/releases?range=week"
            case .upcoming: return "/api/releases"
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    header
                    releaseSection
                    activitySection
                }
                .padding(.bottom, 28)
            }
            .background(Theme.background)
            .navigationDestination(for: Album.self) { AlbumDetailView(album: $0) }
            .toolbar(.hidden, for: .navigationBar)
            .refreshable { await loadAll() }
            .task { await loadAll() }
            .sheet(item: $reportTarget) { review in
                ReportSheet(contentType: "review", contentId: review.id,
                            authorUsername: review.user.username, label: "this review")
            }
        }
        .tint(Theme.accent)
    }

    // MARK: Header

    private var header: some View {
        ZStack(alignment: .bottomLeading) {
            AlbumMosaicView(height: 300)
            VStack(alignment: .leading, spacing: 6) {
                Wordmark(size: 26)
                Text("Welcome back, ")
                    .font(Theme.text(24, weight: .bold))
                    .foregroundStyle(Theme.primary)
                + Text(auth.username ?? "you")
                    .font(Theme.text(24, weight: .bold))
                    .foregroundStyle(Theme.accent)
                + Text("!")
                    .font(Theme.text(24, weight: .bold))
                    .foregroundStyle(Theme.primary)

                Text("Check your friends' picks and log a new album.")
                    .font(Theme.text(14))
                    .foregroundStyle(Theme.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
    }

    // MARK: Releases

    private var releaseSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Bubble pills, same three ranges as the web home.
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ReleaseFilter.allCases) { option in
                        Pill(label: option.label, selected: option == releaseFilter) {
                            releaseFilter = option
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            Task { await loadReleases() }
                        }
                    }
                }
                .padding(.horizontal, 16)
            }

            if releases.isEmpty {
                Text("Nothing in this range right now.")
                    .font(Theme.text(13))
                    .foregroundStyle(Theme.tertiary)
                    .padding(.horizontal, 16)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(releases) { release in
                            NavigationLink(value: release.asAlbum) {
                                ReleaseCard(release: release)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
    }

    // MARK: Activity

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("FRIENDS' ACTIVITY")
                .font(Theme.sectionHeading())
                .tracking(Theme.sectionTracking)
                .foregroundStyle(Theme.secondary)
                .padding(.horizontal, 16)

            if loadingActivity && activity.isEmpty {
                ProgressView().tint(Theme.accent)
                    .frame(maxWidth: .infinity).padding(.vertical, 20)
            } else if activity.isEmpty {
                Text("No activity from people you follow yet.")
                    .font(Theme.text(13))
                    .foregroundStyle(Theme.tertiary)
                    .padding(.horizontal, 16)
            } else {
                VStack(spacing: 0) {
                    ForEach(activity) { review in
                        NavigationLink(value: review.album) {
                            ActivityRow(review: review) { reportTarget = review }
                        }
                        .buttonStyle(.plain)
                        Divider().overlay(Theme.hairline)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: Loading

    private func loadAll() async {
        async let releasesTask: Void = loadReleases()
        async let activityTask: Void = loadActivity()
        _ = await (releasesTask, activityTask)
    }

    private func loadReleases() async {
        releases = (try? await APIClient.shared.releases(path: releaseFilter.query)) ?? []
    }

    private func loadActivity() async {
        loadingActivity = true
        activity = (try? await APIClient.shared.feed()) ?? []
        loadingActivity = false
    }
}

// MARK: - Pieces

struct Pill: View {
    let label: String
    let selected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(Theme.text(13, weight: selected ? .bold : .regular))
                .foregroundStyle(selected ? Color(hex: 0x111111) : Theme.secondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule().fill(selected ? Theme.accent : Theme.surfaceRaised)
                )
                .overlay(
                    Capsule().stroke(selected ? .clear : Theme.border)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct ReleaseCard: View {
    let release: Release

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            AsyncImage(url: release.artworkURL) { $0.resizable().aspectRatio(contentMode: .fill) }
                placeholder: { Rectangle().fill(Theme.surfaceRaised) }
                .frame(width: 132, height: 132)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            Text(release.title)
                .font(Theme.text(13, weight: .bold))
                .foregroundStyle(Theme.primary)
                .lineLimit(1)
            Text(release.artist)
                .font(Theme.text(12))
                .foregroundStyle(Theme.tertiary)
                .lineLimit(1)
        }
        .frame(width: 132, alignment: .leading)
    }
}

private struct ActivityRow: View {
    let review: Review
    var onReport: () -> Void

    var body: some View {
        let tier = Theme.ratingTier(review.rating)

        HStack(alignment: .top, spacing: 12) {
            AsyncImage(url: review.album.artworkURL) { $0.resizable().aspectRatio(contentMode: .fill) }
                placeholder: { Rectangle().fill(Theme.surfaceRaised) }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 3) {
                Text(review.album.title)
                    .font(Theme.text(14, weight: .bold))
                    .foregroundStyle(Theme.primary)
                    .lineLimit(1)
                Text(review.album.artist)
                    .font(Theme.text(12))
                    .foregroundStyle(Theme.tertiary)
                if let body = review.body, !body.isEmpty {
                    Text(body)
                        .font(Theme.text(13))
                        .foregroundStyle(Color(hex: 0xBBBBBB))
                        .lineLimit(2)
                        .padding(.top, 1)
                }
                Text("@\(review.user.username)")
                    .font(Theme.text(11))
                    .foregroundStyle(Theme.secondary)
                    .padding(.top, 2)
            }

            Spacer(minLength: 0)

            Text(tier.letter)
                .font(Theme.text(12, weight: .bold))
                .foregroundStyle(tier.color)
                .frame(width: 32, height: 32)
                .background(Circle().fill(tier.color.opacity(0.1)))
                .overlay(Circle().stroke(tier.color, lineWidth: 1.5))
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
        .contextMenu {
            Button("Report review", systemImage: "flag") { onReport() }
        }
    }
}
