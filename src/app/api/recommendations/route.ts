import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchAlbums } from "@/lib/spotify";
import { getTopArtists } from "@/lib/spotifyUser";

// Recommendations tailored to the signed-in user's own history:
//   1. Albums they rated highly  → the artists & genres they actually love.
//   2. Their Spotify top artists → listening-based taste (artists + genres).
// From that profile we surface (a) more from their favorite artists and (b)
// discovery within their favorite genres — always excluding what they've already
// reviewed. Falls back to social / genre / top-rated when there's no history yet.

type Rec = {
  album: { id: string; spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null };
  avgRating: number | null;
  reviewCount: number;
};

interface SpAlbum { id: string; name: string; images?: { url: string }[]; release_date?: string; artists: { name: string }[] }

const toRec = (a: SpAlbum): Rec => ({
  album: {
    id: a.id,
    spotifyId: a.id,
    title: a.name,
    artist: a.artists.map((x) => x.name).join(", "),
    artwork: a.images?.[0]?.url ?? null,
    year: a.release_date ? parseInt(a.release_date) : null,
  },
  avgRating: null,
  reviewCount: 0,
});

// Rank weighted names (artists), preserving display casing, dedup case-insensitively.
function rankNames(entries: { name: string; weight: number }[], n: number): string[] {
  const m = new Map<string, { name: string; w: number }>();
  for (const e of entries) {
    const name = e.name.trim();
    const k = name.toLowerCase();
    if (!k) continue;
    const cur = m.get(k);
    if (cur) cur.w += e.weight;
    else m.set(k, { name, w: e.weight });
  }
  return [...m.values()].sort((a, b) => b.w - a.w).slice(0, n).map((x) => x.name);
}

// Most frequent tokens (genres).
function topTokens(tokens: string[], n: number): string[] {
  const m = new Map<string, number>();
  for (const t of tokens) {
    const k = t.trim().toLowerCase();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
}

// Filter Spotify albums to fresh, artworked, not-yet-reviewed recs (dedup via `seen`).
function collect(albums: SpAlbum[], seen: Set<string>, reviewed: Set<string>): Rec[] {
  const out: Rec[] = [];
  for (const a of albums) {
    if (!a?.id || !a.images?.[0]?.url) continue;
    if (seen.has(a.id) || reviewed.has(a.id)) continue;
    seen.add(a.id);
    out.push(toRec(a));
  }
  return out;
}

// Alternate two lists so results mix "more from artists you love" with genre discovery.
function interleave(a: Rec[], b: Rec[], limit: number): Rec[] {
  const out: Rec[] = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < limit; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i] && out.length < limit) out.push(b[i]);
  }
  return out;
}

const UNDERGROUND_QUERIES = [
  "genre:underground hip-hop", "genre:shoegaze", "genre:post-punk", "genre:lo-fi",
  "genre:noise rock", "genre:dream pop", "genre:cloud rap", "genre:grime",
];

async function searchToRecs(queries: string[], seen: Set<string>, reviewed: Set<string>): Promise<Rec[]> {
  const results = await Promise.all(queries.map((q) => searchAlbums(q).catch(() => [])));
  return collect(results.flat() as SpAlbum[], seen, reviewed);
}

export async function GET() {
  const session = await auth();
  if (!session) {
    // Not signed in — surface underground discovery, then top-rated.
    try {
      const under = await searchToRecs(UNDERGROUND_QUERIES, new Set(), new Set());
      if (under.length) return NextResponse.json(under.slice(0, 12));
    } catch {}
    return NextResponse.json(await topRatedFallback());
  }

  const userId = session.user.id;

  // --- Build the taste profile from the user's own history ---
  const [reviewed, topArtists, user] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: { rating: true, album: { select: { artist: true, genres: true, spotifyId: true } } },
    }),
    getTopArtists(userId, 20).catch(() => []),
    prisma.user.findUnique({ where: { id: userId }, select: { favoriteGenres: true } }),
  ]);

  const reviewedIds = new Set(reviewed.map((r) => r.album.spotifyId));

  const artistEntries: { name: string; weight: number }[] = [];
  const genreTokens: string[] = [];

  // Signal 1: albums the user rated highly (rating is the weight).
  for (const r of reviewed) {
    if (r.rating >= 3.5) {
      for (const nm of r.album.artist.split(",")) artistEntries.push({ name: nm, weight: r.rating });
      if (r.album.genres) for (const g of r.album.genres.split(",")) genreTokens.push(g);
    }
  }
  // Signal 2: Spotify listening — top artists weighted by rank, plus their genres.
  topArtists.forEach((a, idx) => {
    artistEntries.push({ name: a.name, weight: 5 - (idx / Math.max(topArtists.length, 1)) * 2.5 });
    for (const g of a.genres) genreTokens.push(g);
  });
  // Signal 3: explicitly chosen favorite genres.
  if (user?.favoriteGenres) for (const g of user.favoriteGenres.split(",")) genreTokens.push(g);

  const favoriteArtists = rankNames(artistEntries, 8);
  const favoriteGenres = topTokens(genreTokens, 5);

  // --- Generate candidates tailored to that profile ---
  if (favoriteArtists.length || favoriteGenres.length) {
    const seen = new Set<string>();
    const [artistLists, genreLists] = await Promise.all([
      Promise.all(favoriteArtists.map((a) => searchAlbums(`artist:"${a}"`).catch(() => []))),
      Promise.all(favoriteGenres.map((g) => searchAlbums(g).catch(() => []))),
    ]);
    const artistRecs = collect(artistLists.flat() as SpAlbum[], seen, reviewedIds);
    const genreRecs = collect(genreLists.flat() as SpAlbum[], seen, reviewedIds);
    const tailored = interleave(artistRecs, genreRecs, 15);
    if (tailored.length >= 4) return NextResponse.json(tailored);
  }

  // --- Fallbacks (no usable history yet) ---
  // Social: albums highly rated by people the user follows, not yet reviewed.
  const followed = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const followedIds = followed.map((f) => f.followingId);
  if (followedIds.length > 0) {
    const myAlbumRows = await prisma.review.findMany({ where: { userId }, select: { albumId: true } });
    const myAlbumIds = myAlbumRows.map((r) => r.albumId);
    const recs = await prisma.review.groupBy({
      by: ["albumId"],
      where: {
        userId: { in: followedIds },
        albumId: { notIn: myAlbumIds.length ? myAlbumIds : ["__none__"] },
        rating: { gte: 4 },
      },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
      take: 12,
    });
    if (recs.length) {
      const albums = await prisma.album.findMany({ where: { id: { in: recs.map((r) => r.albumId) } } });
      const out = recs
        .map((r) => ({ album: albums.find((a) => a.id === r.albumId)!, avgRating: r._avg.rating, reviewCount: r._count.rating }))
        .filter((r) => r.album);
      if (out.length) return NextResponse.json(out);
    }
  }

  // Underground discovery.
  try {
    const under = await searchToRecs(UNDERGROUND_QUERIES, new Set(), reviewedIds);
    if (under.length) return NextResponse.json(under.slice(0, 12));
  } catch {}

  // Last resort: top-rated in DB.
  return NextResponse.json(await topRatedFallback());
}

async function topRatedFallback() {
  const top = await prisma.review.groupBy({
    by: ["albumId"],
    _avg: { rating: true },
    _count: { rating: true },
    having: { rating: { _count: { gte: 1 } } },
    orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
    take: 10,
  });
  const albums = await prisma.album.findMany({ where: { id: { in: top.map((r) => r.albumId) } } });
  return top
    .map((r) => ({ album: albums.find((a) => a.id === r.albumId)!, avgRating: r._avg.rating, reviewCount: r._count.rating }))
    .filter((r) => r.album);
}
