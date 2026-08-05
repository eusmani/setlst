import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { popularAlbumsByYear } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Backs the browse chips under the search bar.
//
//   ?year=1994            → popular albums released that year (Spotify catalog)
//   ?decade=1990          → popular albums across 1990–1999 (Spotify catalog)
//   ?sort=popular|rating  → ranked on review activity in our own database
//
// Year/decade come from the catalog rather than our reviews, so the grid is full
// on day one instead of waiting for users to log albums. Both paginate 10 at a
// time via ?page=N so the client's "See more" button just asks for the next page.
// Popular/Highest-Rated stay review-driven and return a single ranked page.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const year = num(sp.get("year"));
  const decade = num(sp.get("decade"));
  const page = Math.max(0, num(sp.get("page")) ?? 0);

  // --- Catalog-backed release filters ---
  if (year !== null || decade !== null) {
    // Backstop the UI's year cap: never search past the current year. A future
    // year returns nothing; a decade is clamped so its range ends at this year
    // (e.g. the 2020s searches 2020–2026 today, not 2020–2029).
    const nowYear = new Date().getUTCFullYear();
    let spec: string;
    if (year !== null) {
      if (year > nowYear) return NextResponse.json([]);
      spec = String(year);
    } else {
      if (decade! > nowYear) return NextResponse.json([]);
      spec = `${decade}-${Math.min(decade! + 9, nowYear)}`;
    }
    try {
      const albums = await popularAlbumsByYear(spec, page);
      return NextResponse.json(
        albums.map((a) => ({
          spotifyId: a.id,
          title: a.name,
          artist: a.artists.map((x) => x.name).join(", "),
          artwork: a.images?.[0]?.url ?? null,
          year: a.release_date ? parseInt(a.release_date) : null,
        })),
      );
    } catch {
      return NextResponse.json([]);
    }
  }

  // --- Review-backed ranking (popular / highest rated) ---
  const sort = sp.get("sort") === "rating" ? "rating" : "popular";
  try {
    const grouped = await prisma.review.groupBy({
      by: ["albumId"],
      // Moderator-removed reviews must not skew album ratings.
      where: { removedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
      having: { rating: { _count: { gte: 1 } } },
      orderBy: sort === "rating"
        ? [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }]
        : [{ _count: { rating: "desc" } }, { _avg: { rating: "desc" } }],
      take: 30,
    });
    if (grouped.length === 0) return NextResponse.json([]);

    const albums = await prisma.album.findMany({
      where: { id: { in: grouped.map((g) => g.albumId) } },
      select: { id: true, spotifyId: true, title: true, artist: true, artwork: true, year: true },
    });
    const byId = new Map(albums.map((a) => [a.id, a]));

    const out = grouped.flatMap((g) => {
      const a = byId.get(g.albumId);
      if (!a) return [];
      return [{
        spotifyId: a.spotifyId,
        title: a.title,
        artist: a.artist,
        artwork: a.artwork,
        year: a.year,
        avgRating: g._avg.rating,
        reviewCount: g._count.rating,
      }];
    });
    return NextResponse.json(out);
  } catch {
    return NextResponse.json([]);
  }
}

function num(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
