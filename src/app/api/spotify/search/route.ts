import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { searchArtistsAndAlbums, type SpotifyAlbum, type SpotifyArtist } from "@/lib/spotify";

// Reject tributes, karaoke, covers, parodies, instrumentals, etc.
const BAD = /\b(tribute|karaoke|made famous|in the style of|originally performed|cover version|covers of|string quartet|lullaby|piano versions?|instrumental|8-bit|parody|parodies|spoof)\b/i;
const BAD_ARTIST = /various artists|karaoke|tribute|vitamin string|\bcover|parody|sub par all star/i;

// Spotify lumps EPs under album_type "single" — split them out by name / track count.
function albumType(a: SpotifyAlbum): "album" | "single" | "ep" {
  if (a.album_type === "single") {
    if (/\bE\.?P\.?\b/i.test(a.name) || (a.total_tracks >= 4 && a.total_tracks <= 6)) return "ep";
    return "single";
  }
  return "album";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [], artists: [] });

  try {
    const { artists, albums } = await searchArtistsAndAlbums(q);

    // Artists ranked by popularity — the most popular match leads the results.
    const rankedArtists = artists
      .filter((a: SpotifyArtist) => a.name && !BAD_ARTIST.test(a.name) && !isLikelyAI(a.name, ""))
      .sort((x, y) => (y.popularity ?? 0) - (x.popularity ?? 0) || (y.followers?.total ?? 0) - (x.followers?.total ?? 0))
      .slice(0, 12)
      .map((a) => ({ id: a.id, name: a.name, image: a.images?.[0]?.url ?? null, popularity: a.popularity ?? 0 }));

    // Albums to review. Keep Spotify's relevance order, but float albums by the
    // top popular artists to the front so popular matches come first.
    const topArtistNames = new Set(rankedArtists.slice(0, 5).map((a) => a.name.toLowerCase()));
    const seen = new Set<string>();
    const results = albums
      .filter((a) =>
        a.id && a.name && a.images?.[0]?.url && a.artists?.[0]?.name &&
        !BAD.test(a.name) && !BAD_ARTIST.test(a.artists[0].name) && !isLikelyAI(a.artists[0].name, a.name)
      )
      .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
      .map((a) => ({
        id: a.id,
        name: a.name,
        artists: a.artists.map((x) => ({ name: x.name })),
        images: [{ url: a.images[0].url }],
        release_date: a.release_date ?? "",
        type: albumType(a),
        _boost: topArtistNames.has(a.artists[0].name.toLowerCase()) ? 1 : 0,
      }))
      .sort((x, y) => y._boost - x._boost)
      .map(({ _boost, ...rest }) => { void _boost; return rest; });

    return NextResponse.json({ results: results.slice(0, 30), artists: rankedArtists });
  } catch {
    return NextResponse.json({ results: [], artists: [] });
  }
}
