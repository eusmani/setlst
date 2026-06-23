import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { POPULAR_ARTISTS, POPULAR_RANK } from "@/lib/popularArtists";

// Reject tributes, karaoke, covers, parodies, instrumentals, etc.
const BAD = /\b(tribute|karaoke|made famous|in the style of|originally performed|cover version|covers of|string quartet|lullaby|piano versions?|instrumental|8-bit|parody|parodies|spoof)\b/i;
const BAD_ARTIST = /various artists|karaoke|tribute|vitamin string|\bcover|parody|sub par all star/i;

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
}

function keep(a: ItunesAlbum): boolean {
  return Boolean(
    a.collectionId &&
    a.collectionName &&
    a.artistName &&
    a.artworkUrl100 &&
    !BAD.test(a.collectionName) &&
    !BAD_ARTIST.test(a.artistName) &&
    !isLikelyAI(a.artistName, a.collectionName)
  );
}

function toResult(a: ItunesAlbum) {
  const name = a.collectionName as string;
  const tracks = a.trackCount ?? 0;
  let type: "album" | "single" | "ep" = "album";
  if (/-\s*single\b/i.test(name) || tracks <= 2) type = "single";
  else if (/-\s*ep\b/i.test(name) || tracks <= 6) type = "ep";
  return {
    id: String(a.collectionId),
    name,
    artists: [{ name: a.artistName as string }],
    images: [{ url: (a.artworkUrl100 as string).replace("100x100bb", "600x600bb") }],
    release_date: a.releaseDate ?? "",
    type,
  };
}

async function itunesAlbums(term: string, limit: number): Promise<ItunesAlbum[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];
  return ((await res.json()).results as ItunesAlbum[]) ?? [];
}

// A representative (most recent) album for a known artist, used to surface that
// artist when their name matches the typed prefix.
async function topAlbumForArtist(name: string): Promise<ItunesAlbum | null> {
  const items = (await itunesAlbums(name, 5)).filter(keep);
  const exact = items.filter((a) => (a.artistName ?? "").toLowerCase() === name.toLowerCase());
  const pool = exact.length ? exact : items;
  if (!pool.length) return null;
  // newest release for that artist
  return pool.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))[0];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });
  const ql = q.trim().toLowerCase();

  try {
    // Popular artists whose name matches what's typed — prefix first, then contains.
    const starts = POPULAR_ARTISTS.filter((a) => a.toLowerCase().startsWith(ql));
    const contains = POPULAR_ARTISTS.filter(
      (a) => !a.toLowerCase().startsWith(ql) && a.toLowerCase().includes(ql)
    );
    const matchedArtists = [...starts, ...contains].slice(0, 8);

    // Normal album search + a representative album for each matched popular
    // artist, all in parallel.
    const [rawAlbums, artistAlbums] = await Promise.all([
      itunesAlbums(q, 24),
      Promise.all(matchedArtists.map(topAlbumForArtist)),
    ]);

    const seen = new Set<string>();
    const results: ReturnType<typeof toResult>[] = [];
    const push = (a: ItunesAlbum) => {
      if (!keep(a)) return;
      const id = String(a.collectionId);
      if (seen.has(id)) return;
      seen.add(id);
      results.push(toResult(a));
    };

    // 1) Popular matched artists first, in popularity order.
    artistAlbums.forEach((a) => a && push(a));

    // 2) The rest of the album search, ordered so albums by popular artists
    //    (ranked) come before everything else; ties keep iTunes' relevance order.
    const rank = (a: ItunesAlbum) => POPULAR_RANK.get((a.artistName ?? "").toLowerCase()) ?? Infinity;
    rawAlbums
      .map((a, i) => ({ a, i }))
      .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i)
      .forEach(({ a }) => push(a));

    return NextResponse.json({ results: results.slice(0, 30) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
