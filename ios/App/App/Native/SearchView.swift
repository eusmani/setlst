import SwiftUI

/// Album and member search, rebuilt natively.
///
/// This is the entry point to the logging loop — search an album, open it, rate
/// it — so it uses the native `.searchable` chrome rather than a text field, and
/// pushes straight into `AlbumDetailView`.
struct SearchView: View {
    @State private var query = ""
    @State private var albums: [Album] = []
    @State private var people: [UserLite] = []
    @State private var scope: Scope = .albums
    @State private var searching = false
    @State private var searchTask: Task<Void, Never>?
    @State private var selectedGenre: String?

    enum Scope: String, CaseIterable, Identifiable {
        case albums = "Albums"
        case people = "People"
        var id: String { rawValue }
    }

    /// Same list as `src/components/search/SearchFilters.tsx`.
    private static let genres = [
        "Hip-Hop", "Rap", "R&B", "Rock", "Alternative", "Indie",
        "Metal", "Jazz", "Soul", "Electronic", "Pop", "Classical",
        "Reggae", "Latin", "Blues", "Punk", "Shoegaze", "Lo-Fi",
    ]

    var body: some View {
        NavigationStack {
            Group {
                if query.trimmingCharacters(in: .whitespaces).isEmpty {
                    browse
                } else if searching && albums.isEmpty && people.isEmpty {
                    ProgressView().tint(Theme.accent)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    results
                }
            }
            .background(Theme.background)
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: Album.self) { AlbumDetailView(album: $0) }
        }
        .tint(Theme.accent)
        .searchable(text: $query, prompt: "Albums, artists, people")
        .onChange(of: query) { _, value in scheduleSearch(value) }
    }

    /// Empty-query state: the genre pills the web search screen shows, so the
    /// tab is browsable rather than a blank box.
    private var browse: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("BROWSE BY GENRE")
                    .font(Theme.sectionHeading())
                    .tracking(Theme.sectionTracking)
                    .foregroundStyle(Theme.secondary)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                // Flowing pill rows, like the web's wrapped flex layout.
                FlowLayout(spacing: 8) {
                    ForEach(Self.genres, id: \.self) { genre in
                        Pill(label: genre, selected: genre == selectedGenre) {
                            selectedGenre = genre == selectedGenre ? nil : genre
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            query = genre == selectedGenre ? genre : ""
                        }
                    }
                }
                .padding(.horizontal, 16)

                SearchPrompt().padding(.top, 24)
            }
        }
    }

    @ViewBuilder private var results: some View {
        List {
            Picker("Scope", selection: $scope) {
                ForEach(Scope.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .listRowBackground(Theme.background)
            .listRowSeparator(.hidden)

            switch scope {
            case .albums:
                if albums.isEmpty && !searching {
                    EmptyRow(text: "No albums match “\(query)”.")
                } else {
                    ForEach(albums) { album in
                        NavigationLink(value: album) { AlbumRow(album: album) }
                            .listRowBackground(Theme.background)
                    }
                }
            case .people:
                if people.isEmpty && !searching {
                    EmptyRow(text: "No members match “\(query)”.")
                } else {
                    ForEach(people) { person in
                        PersonRow(person: person).listRowBackground(Theme.background)
                    }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    /// Debounced so typing doesn't fire a request per keystroke; the previous
    /// in-flight search is cancelled rather than left to race the new one.
    private func scheduleSearch(_ raw: String) {
        searchTask?.cancel()
        let term = raw.trimmingCharacters(in: .whitespaces)
        guard !term.isEmpty else {
            albums = []; people = []; searching = false
            return
        }
        searching = true
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(280))
            guard !Task.isCancelled else { return }
            await runSearch(term)
        }
    }

    private func runSearch(_ term: String) async {
        async let albumHits = APIClient.shared.searchAlbums(term)
        async let peopleHits = APIClient.shared.searchPeople(term)
        let (a, p) = ((try? await albumHits) ?? [], (try? await peopleHits) ?? [])
        guard !Task.isCancelled else { return }
        albums = a
        people = p
        searching = false
    }
}

// MARK: - Rows

private struct AlbumRow: View {
    let album: Album

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: album.artworkURL) { $0.resizable().aspectRatio(contentMode: .fill) }
                placeholder: { Rectangle().fill(Theme.surfaceRaised) }
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 3) {
                Text(album.title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.primary)
                    .lineLimit(1)
                Text(album.artist)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.tertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if let year = album.year {
                Text(String(year))
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.tertiary)
            }
        }
        .padding(.vertical, 2)
    }
}

private struct PersonRow: View {
    let person: UserLite

    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(Theme.surfaceRaised).frame(width: 42, height: 42)
                .overlay(
                    Text(person.username.prefix(2).uppercased())
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.secondary)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text("@\(person.username)")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.primary)
                if let bio = person.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.tertiary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }
}

private struct EmptyRow: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(Theme.secondary)
            .listRowBackground(Theme.background)
            .listRowSeparator(.hidden)
    }
}

private struct SearchPrompt: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32))
                .foregroundStyle(Theme.tertiary)
            Text("Find something to log")
                .font(Theme.serif(19))
                .foregroundStyle(Theme.primary)
            Text("Search any album, artist, or member of SETLST.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 44)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
