import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { searchArtistsAndAlbums, searchAlbumsViaITunes, type SpotifyAlbum, type SpotifyArtist } from "@/lib/spotify";

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

  // Artists inferred from album results.
  //
  // Spotify is the only source of artist objects, so whenever its quota ran out
  // the Artists row vanished: you could search "Tame Impala", get twenty of
  // their albums back from the iTunes fallback, and have no way to open the
  // artist. iTunes has no artist-photo endpoint, so the avatar is one of their
  // own covers — an artist you can reach beats an artist you can't.
  function artistsFromAlbums(albums: SpotifyAlbum[]) {
    const want = q.toLowerCase();
    const match = (name: string) => {
      const n = name.toLowerCase();
      if (n === want) return 3;
      if (n.startsWith(want)) return 2;
      if (n.includes(want)) return 1;
      return 0;
    };

    const byName = new Map<string, { name: string; image: string | null; count: number }>();
    for (const a of albums) {
      const name = a.artists?.[0]?.name;
      if (!name || BAD_ARTIST.test(name) || isLikelyAI(name, a.name ?? "")) continue;
      const key = name.toLowerCase();
      const seen = byName.get(key);
      if (seen) seen.count += 1;
      else byName.set(key, { name, image: a.images?.[0]?.url ?? null, count: 1 });
    }

    return [...byName.values()]
      // Name match first, then how much of the catalogue came back for them.
      .sort((x, y) => match(y.name) - match(x.name) || y.count - x.count)
      .filter((a) => match(a.name) > 0)
      .slice(0, 12)
      .map((a) => ({ id: `name:${a.name}`, name: a.name, image: a.image, popularity: 0 }));
  }

  try {
    let { artists, albums } = await searchArtistsAndAlbums(q);

    // Spotify's quota runs out for hours at a time, and when it does every
    // search came back empty — indistinguishable from "no such album". Fall back
    // to the iTunes catalogue so search keeps working.
    let degraded = false;
    if (albums.length === 0) {
      const fallback = await searchAlbumsViaITunes(q);
      if (fallback.length > 0) {
        albums = fallback;
        artists = [];
        degraded = true;
      }
    }

    // Artists ranked by popularity — the most popular match leads the results.
    const spotifyArtists = artists
      .filter((a: SpotifyArtist) => a.name && !BAD_ARTIST.test(a.name) && !isLikelyAI(a.name, ""))
      .sort((x, y) => (y.popularity ?? 0) - (x.popularity ?? 0) || (y.followers?.total ?? 0) - (x.followers?.total ?? 0))
      .slice(0, 12)
      .map((a) => ({ id: a.id, name: a.name, image: a.images?.[0]?.url ?? null, popularity: a.popularity ?? 0 }));

    // Falling back to names off the albums whenever Spotify gave us no artists,
    // rather than only when `degraded` is set — an empty artist list with albums
    // present is the same dead end however it came about.
    const rankedArtists = spotifyArtists.length ? spotifyArtists : artistsFromAlbums(albums);

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

    return NextResponse.json({ results: results.slice(0, 30), artists: rankedArtists, degraded });
  } catch (error) {
    console.error("[search] failed:", error);
    // Last resort: the catalogue search itself threw. Say so rather than
    // pretending the catalogue is empty.
    return NextResponse.json({ results: [], artists: [], unavailable: true });
  }
}
