import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { prisma } from "@/lib/prisma";

// Subgenre-specific albums sourced from MusicBrainz genre TAGS, then confirmed on
// Apple Music (resolves real cover + id, and filters the most obscure tag spam).
const UA = "SETLST/1.0 (music review app; contact: setlst@example.com)";
const BAD = /\b(tribute|karaoke|made famous|cover version|instrumental|8-bit|parody)\b/i;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface RG { title?: string; "first-release-date"?: string; score?: number; "artist-credit"?: { name?: string }[] }

async function itunes(title: string, artist: string) {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=5`,
      { next: { revalidate: 604800 } }
    );
    if (!r.ok) return null;
    const results: { collectionId?: number; collectionName?: string; artistName?: string; artworkUrl100?: string; releaseDate?: string }[] =
      (await r.json()).results ?? [];
    const wantT = norm(title), wantA = norm(artist).slice(0, 8);
    const hit = results.find(
      (a) => a.collectionId && a.collectionName && a.artistName && a.artworkUrl100 &&
        !BAD.test(a.collectionName) && norm(a.artistName).includes(wantA) && norm(a.collectionName).includes(wantT)
    );
    if (!hit) return null;
    return {
      id: String(hit.collectionId),
      title: hit.collectionName as string,
      artist: hit.artistName as string,
      artwork: (hit.artworkUrl100 as string).replace("100x100bb", "600x600bb"),
      year: hit.releaseDate ? parseInt(hit.releaseDate.slice(0, 4)) : null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("genre");
  if (!genre) return NextResponse.json([]);
  try {
    const q = `tag:"${genre}" AND primarytype:Album`;
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(q)}&fmt=json&limit=60`,
      { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 604800 } }
    );
    if (!res.ok) return NextResponse.json([]);
    const rgs: RG[] = (await res.json())["release-groups"] ?? [];

    // Dedupe by title+artist, drop AI, keep good tag-match scores.
    const seen = new Set<string>();
    const candidates = rgs
      .filter((rg) => rg.title && (rg["artist-credit"]?.[0]?.name) && (rg.score ?? 0) >= 85)
      .map((rg) => ({ title: rg.title as string, artist: rg["artist-credit"]![0].name as string }))
      .filter((c) => !isLikelyAI(c.artist, c.title))
      .filter((c) => {
        const k = `${norm(c.title)}|${norm(c.artist)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 28);

    // Confirm on Apple Music (real cover/id) — drops the most obscure tag spam.
    const resolved = await Promise.all(candidates.map((c) => itunes(c.title, c.artist)));
    const base: (NonNullable<Awaited<ReturnType<typeof itunes>>> & { avgRating: number | null; reviewCount: number })[] = [];
    const ids = new Set<string>();
    for (const a of resolved) if (a && !ids.has(a.id)) { ids.add(a.id); base.push({ ...a, avgRating: null, reviewCount: 0 }); }

    // Rank by the app's own user ratings (the only real rating source) — highest rated
    // in this subgenre first, then the rest of the subgenre discoveries.
    try {
      const rated = await prisma.album.findMany({
        where: { spotifyId: { in: base.map((a) => a.id) } },
        select: { spotifyId: true, reviews: { select: { rating: true } } },
      });
      const m = new Map(rated.map((al) => [al.spotifyId, al.reviews]));
      for (const a of base) {
        const revs = m.get(a.id) ?? [];
        if (revs.length) { a.reviewCount = revs.length; a.avgRating = revs.reduce((s, r) => s + r.rating, 0) / revs.length; }
      }
    } catch { /* no DB → unranked order */ }

    base.sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));
    return NextResponse.json(base.slice(0, 18));
  } catch {
    return NextResponse.json([]);
  }
}
