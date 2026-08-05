import SwiftUI

/// The album wall behind the home header, ported from the web `AlbumMosaic`.
///
/// A four-across grid of covers at 50% opacity, shuffled once per launch, with
/// a vertical fade to the background and a lighter vignette on the sides so the
/// text above it stays readable.
struct AlbumMosaicView: View {
    /// How tall the wall is. The web version is 1500px and fades out on scroll;
    /// here it sits behind the header and fades within its own height.
    var height: CGFloat = 460

    @State private var covers: [String] = MosaicArtwork.urls

    private let columns = 4

    var body: some View {
        ZStack {
            grid
            // Vertical fade to the page background, matching the web gradients.
            LinearGradient(
                colors: [
                    Theme.background.opacity(0.10),
                    Theme.background.opacity(0.55),
                    Theme.background,
                ],
                startPoint: .top, endPoint: .bottom
            )
            // Side vignette.
            LinearGradient(
                colors: [
                    Theme.background.opacity(0.55),
                    .clear,
                    Theme.background.opacity(0.55),
                ],
                startPoint: .leading, endPoint: .trailing
            )
        }
        .frame(height: height)
        .clipped()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { covers = MosaicArtwork.urls.shuffled() }
    }

    private var grid: some View {
        GeometryReader { geo in
            let side = geo.size.width / CGFloat(columns)
            let rows = Int(ceil(height / side))
            let needed = rows * columns

            VStack(spacing: 0) {
                ForEach(0..<max(rows, 1), id: \.self) { row in
                    HStack(spacing: 0) {
                        ForEach(0..<columns, id: \.self) { column in
                            let index = row * columns + column
                            cover(at: index, in: needed)
                                .frame(width: side, height: side)
                                .clipped()
                        }
                    }
                }
            }
            .opacity(0.5)
        }
    }

    @ViewBuilder
    private func cover(at index: Int, in needed: Int) -> some View {
        // Tile the list if the grid needs more cells than there are covers.
        let url = covers.isEmpty ? nil : URL(string: covers[index % covers.count])
        AsyncImage(url: url) { image in
            image.resizable().aspectRatio(contentMode: .fill)
        } placeholder: {
            Rectangle().fill(Theme.surface)
        }
    }
}
