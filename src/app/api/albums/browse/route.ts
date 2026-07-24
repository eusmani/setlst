import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Backs the filter chips under the search bar: most-reviewed, highest-rated,
// and released-in-a-given-year/decade.
//
// All three rank on review activity in our own database rather than an external
// chart, so "popular" means popular *here*. The tradeoff is that the release
// filters can only surface albums somebody has already logged — a decade nobody
// has touched comes back empty, which the UI reports rather than hides.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort") === "rating" ? "rating" : "popular";
  const year = num(sp.get("year"));
  const decade = num(sp.get("decade"));

  try {
    // Narrow to a release window first when one was asked for.
    let albumIds: string[] | null = null;
    if (year !== null || decade !== null) {
      const where = year !== null
        ? { year }
        : { year: { gte: decade!, lte: decade! + 9 } };
      const inWindow = await prisma.album.findMany({ where, select: { id: true }, take: 500 });
      if (inWindow.length === 0) return NextResponse.json([]);
      albumIds = inWindow.map((a) => a.id);
    }

    const grouped = await prisma.review.groupBy({
      by: ["albumId"],
      ...(albumIds ? { where: { albumId: { in: albumIds } } } : {}),
      _avg: { rating: true },
      _count: { rating: true },
      having: { rating: { _count: { gte: 1 } } },
      // Ties break on the other axis so a single 5-star review doesn't outrank
      // an album with twenty strong ones.
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

    // groupBy already returned them in rank order — preserve it.
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
    // Browsing is a nicety — never put an error on /search.
    return NextResponse.json([]);
  }
}

function num(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
