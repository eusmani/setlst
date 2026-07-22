import { NextResponse } from "next/server";
import { GENRE_QUERIES, fetchOne } from "@/app/api/spotify/genre/route";

// Returns ONE random popular album, drawn from a handful of the most popular
// genres. The onboarding "Log & rate every album" slide calls this on first
// launch so it showcases a real, rotating album cover instead of a static icon.
export const dynamic = "force-dynamic";

// Genres to pull from — the mainstream ones a new user is most likely to
// recognize. Weighted implicitly by list length in GENRE_QUERIES.
const POPULAR_GENRES = ["Rock", "Hip-Hop", "Alternative", "Pop", "R&B", "Indie"];

export async function GET() {
  // Flatten the curated queries for the popular genres into one pool.
  const pool = POPULAR_GENRES.flatMap((g) => GENRE_QUERIES[g] ?? []);
  if (pool.length === 0) return NextResponse.json(null, { status: 503 });

  // Try a few random picks in case one fails to resolve (throttle / no match).
  for (let attempt = 0; attempt < 4; attempt++) {
    const q = pool[Math.floor(Math.random() * pool.length)];
    const album = await fetchOne(q).catch(() => null);
    if (album && album.artwork) {
      // Tidy up the display title: drop "- Single"/"- EP" and edition suffixes
      // so the onboarding caption reads like a clean album name.
      const title = album.title
        .replace(/\s*[-–]\s*(Single|EP)\s*$/i, "")
        .replace(/\s*\((Deluxe|Deluxe Edition|Remastered|Expanded|Edit)[^)]*\)\s*$/i, "")
        .trim();
      return NextResponse.json({ ...album, title }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  return NextResponse.json(null, { status: 503 });
}
