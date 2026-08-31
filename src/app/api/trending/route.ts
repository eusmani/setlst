import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notDemoAlbum } from "@/lib/demo";

export const dynamic = "force-dynamic";

interface Row {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  reviewCount: number;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  avgRating: number | null;
  newest: number; // ms timestamp of most recent activity
  score: number;
}

export async function GET() {
  const now = Date.now();
  const DAY = 86_400_000;
  const currentYear = new Date().getFullYear();

  // Seeded demo albums are excluded here. They exist so App Store screenshots
  // contain no label-owned artwork, but this list ranks by review activity — and
  // the seed's own reviews were enough to push invented bands into everyone's
  // discovery feed, where they read as machine-generated filler.
  const [albums, saved, comments] = await Promise.all([
    prisma.album.findMany({
      where: { spotifyId: notDemoAlbum },
      include: {
        reviews: { select: { rating: true, createdAt: true, likes: { select: { value: true } } } },
      },
    }),
    prisma.savedAlbum.findMany({
      where: { spotifyId: notDemoAlbum },
      select: { spotifyId: true, title: true, artist: true, artwork: true, year: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { removedAt: null, albumSpotifyId: notDemoAlbum },
      select: { albumSpotifyId: true, createdAt: true },
    }),
  ]);

  const map = new Map<string, Row>();

  // Base rows from reviewed albums
  for (const a of albums) {
    const reviewCount = a.reviews.length;
    const likeCount = a.reviews.reduce((s, r) => s + r.likes.filter((l) => l.value === 1).length, 0);
    const avgRating = reviewCount ? a.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : null;
    const newest = a.reviews.reduce((m, r) => Math.max(m, r.createdAt.getTime()), 0);
    map.set(a.spotifyId, {
      spotifyId: a.spotifyId, title: a.title, artist: a.artist, artwork: a.artwork ?? null, year: a.year ?? null,
      reviewCount, likeCount, saveCount: 0, commentCount: 0, avgRating, newest, score: 0,
    });
  }

  // Listen-list saves (may reference albums not yet reviewed → add metadata from here)
  for (const s of saved) {
    let row = map.get(s.spotifyId);
    if (!row) {
      row = {
        spotifyId: s.spotifyId, title: s.title, artist: s.artist, artwork: s.artwork ?? null, year: s.year ?? null,
        reviewCount: 0, likeCount: 0, saveCount: 0, commentCount: 0, avgRating: null, newest: 0, score: 0,
      };
      map.set(s.spotifyId, row);
    }
    row.saveCount += 1;
    row.newest = Math.max(row.newest, s.createdAt.getTime());
  }

  // Comments (only counted for albums we already have metadata for)
  for (const c of comments) {
    const row = map.get(c.albumSpotifyId);
    if (row) { row.commentCount += 1; row.newest = Math.max(row.newest, c.createdAt.getTime()); }
  }

  // Score: engagement × recency × current/last-year boost
  const ranked = [...map.values()]
    .map((r) => {
      const base = r.reviewCount * 3 + r.likeCount * 2 + r.saveCount * 2 + r.commentCount;
      const days = r.newest ? (now - r.newest) / DAY : Infinity;
      const recency = days < 7 ? 2 : days < 30 ? 1.5 : days < 90 ? 1.2 : 1;
      const yearBoost = r.year != null && r.year >= currentYear - 1 ? 1.3 : 1;
      return { ...r, score: base * recency * yearBoost };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  // One release per record, not one per catalogue id.
  //
  // The same album exists under several ids — a reissue, an anniversary edition,
  // a different territory — and each carries its own reviews, so Illmatic and
  // In Utero were each listed twice. Merging is done here rather than in the
  // database because both rows are legitimate: people reviewed the edition they
  // own. Editions are stripped before comparing, and the highest-scoring row
  // survives, so the merged entry is the one people actually engaged with.
  const bare = (v: string) =>
    v.toLowerCase().replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const seenRelease = new Set<string>();
  const deduped = ranked.filter((r) => {
    const key = `${bare(r.title)}|${bare(r.artist)}`;
    if (seenRelease.has(key)) return false;
    seenRelease.add(key);
    return true;
  });

  // Popular This Week is based only on the app's own user activity (reviews, saves,
  // likes, comments) — no external chart fill.
  return NextResponse.json(deduped.slice(0, 30));
}
