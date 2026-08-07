import WidgetKit
import SwiftUI

// Home Screen widget (App Store guideline 4.2).
//
// This is functionality a web page structurally cannot provide: it lives on the
// Home Screen, updates on its own timeline, and is visible without opening the
// app at all.
//
// Data arrives through the shared App Group container, which the app writes to
// after each feed load. The widget never makes network calls of its own — it has
// no session, and a widget that shows a signed-out state would be worse than one
// showing the last known good data.

private let appGroup = "group.app.setlst.native"
private let payloadKey = "widget.recentAlbums"

struct RecentAlbum: Codable, Hashable {
    let title: String
    let artist: String
    let grade: String?
    let artworkData: Data?
}

struct Entry: TimelineEntry {
    let date: Date
    let albums: [RecentAlbum]
    /// True before the app has ever written anything — shown as a prompt rather
    /// than an empty box.
    let needsAppLaunch: Bool
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), albums: [], needsAppLaunch: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(load())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        // Refresh hourly. The app also nudges WidgetKit after a feed load, so
        // this is a floor rather than the only update path.
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [load()], policy: .after(next)))
    }

    private func load() -> Entry {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.data(forKey: payloadKey),
              let albums = try? JSONDecoder().decode([RecentAlbum].self, from: data)
        else {
            return Entry(date: Date(), albums: [], needsAppLaunch: true)
        }
        return Entry(date: Date(), albums: albums, needsAppLaunch: false)
    }
}

// MARK: - Views

private let bg = Color(red: 0.067, green: 0.067, blue: 0.067)
private let gold = Color(red: 0.769, green: 0.659, blue: 0.196)
private let dim = Color(red: 0.627, green: 0.627, blue: 0.627)

struct SETLSTWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: Entry

    var body: some View {
        Group {
            if entry.needsAppLaunch || entry.albums.isEmpty {
                emptyState
            } else if family == .systemSmall {
                small
            } else {
                medium
            }
        }
        .containerBackground(bg, for: .widget)
    }

    private var emptyState: some View {
        VStack(spacing: 6) {
            Text("SETLST").font(.system(size: 15, weight: .bold)).foregroundStyle(gold)
            Text("Log an album to see it here")
                .font(.system(size: 11))
                .foregroundStyle(dim)
                .multilineTextAlignment(.center)
        }
        .padding(8)
    }

    private var small: some View {
        let album = entry.albums[0]
        return VStack(alignment: .leading, spacing: 6) {
            artwork(album, size: 64)
            Text(album.title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .lineLimit(2)
            Text(album.artist)
                .font(.system(size: 10))
                .foregroundStyle(dim)
                .lineLimit(1)
        }
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RECENTLY LOGGED")
                .font(.system(size: 9, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(dim)
            HStack(spacing: 10) {
                ForEach(entry.albums.prefix(4), id: \.self) { album in
                    VStack(alignment: .leading, spacing: 4) {
                        artwork(album, size: 58)
                        Text(album.title)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                    }
                }
            }
        }
    }

    private func artwork(_ album: RecentAlbum, size: CGFloat) -> some View {
        ZStack(alignment: .topTrailing) {
            if let data = album.artworkData, let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size, height: size)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: size, height: size)
            }
            if let grade = album.grade {
                Text(grade)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 4).padding(.vertical, 1)
                    .background(Capsule().fill(gold))
                    .padding(3)
            }
        }
    }
}

@main
struct SETLSTWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SETLSTWidget", provider: Provider()) { entry in
            SETLSTWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Recently logged")
        .description("The albums you've rated most recently.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
