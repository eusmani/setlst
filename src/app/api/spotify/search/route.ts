import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { searchArtistsAndAlbums, searchAlbumsViaITunes, searchArtistsViaITunes, type SpotifyAlbum, type SpotifyArtist } from "@/lib/spotify";

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

  /**
   * Cover art for an artist, borrowed from the album results.
   *
   * The artist endpoint returns no images, so a release of theirs stands in.
   * Falls back to null, which renders as a plain circle.
   */
  function coverFor(name: string, albums: SpotifyAlbum[]): string | null {
    const want = name.toLowerCase();
    const hit = albums.find((a) => a.artists?.[0]?.name?.toLowerCase() === want);
    return hit?.images?.[0]?.url ?? null;
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
    // De-duplicated by name for the same reason as the iTunes path: artist pages
    // are keyed by name, so two artists sharing one open the same page. Dedupe
    // after the sort, so the survivor is the better-known one.
    const nameSeen = new Set<string>();
    const spotifyArtists = artists
      .filter((a: SpotifyArtist) => a.name && !BAD_ARTIST.test(a.name) && !isLikelyAI(a.name, ""))
      .sort((x, y) => (y.popularity ?? 0) - (x.popularity ?? 0) || (y.followers?.total ?? 0) - (x.followers?.total ?? 0))
      .filter((a) => {
        const key = a.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!key || nameSeen.has(key)) return false;
        nameSeen.add(key);
        return true;
      })
      .slice(0, 12)
      .map((a) => ({ id: a.id, name: a.name, image: a.images?.[0]?.url ?? null, popularity: a.popularity ?? 0 }));

    // Whenever Spotify gave us no artists — not only when `degraded` is set, since
    // an empty artist list alongside albums is the same dead end however it arose
    // — ask the iTunes catalogue directly. Its ordering is by relevance and sales,
    // so the famous act leads: "earl" gives Earl Sweatshirt, not the obscure acts
    // named exactly "Earl".
    const rankedArtists = spotifyArtists.length
      ? spotifyArtists
      : (await searchArtistsViaITunes(q))
          .filter((a) => !BAD_ARTIST.test(a.name) && !isLikelyAI(a.name, ""))
          .slice(0, 12)
          .map((a) => ({ id: `itunes:${a.id}`, name: a.name, image: coverFor(a.name, albums), popularity: 0 }));

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
