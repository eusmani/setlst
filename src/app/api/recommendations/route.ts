import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchAlbums } from "@/lib/spotify";

const UNDERGROUND_QUERIES = [
  "genre:underground hip-hop",
  "genre:shoegaze",
  "genre:post-punk",
  "genre:lo-fi",
  "genre:noise rock",
  "genre:dream pop",
  "genre:cloud rap",
  "genre:grime",
];

async function getUndergroundAlbums() {
  const results = await Promise.all(
    UNDERGROUND_QUERIES.map((q) => searchAlbums(q).catch(() => []))
  );
  const seen = new Set<string>();
  return results.flat().filter((a) => {
    if (seen.has(a.id) || !a.images?.[0]?.url) return false;
    seen.add(a.id);
    return true;
  }).map((a) => ({
    album: {
      id: a.id, spotifyId: a.id,
      title: a.name,
      artist: a.artists.map((x) => x.name).join(", "),
      artwork: a.images[0].url,
      year: a.release_date ? parseInt(a.release_date) : null,
    },
    avgRating: null,
    reviewCount: 0,
  }));
}

export async function GET() {
  const session = await auth();

  if (session) {
    // Albums highly rated by followed users that this user hasn't reviewed
    const followed = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const followedIds = followed.map((f) => f.followingId);

    const reviewed = await prisma.review.findMany({
      where: { userId: session.user.id },
      select: { albumId: true },
    });
    const reviewedAlbumIds = reviewed.map((r) => r.albumId);

    if (followedIds.length > 0) {
      const recs = await prisma.review.groupBy({
        by: ["albumId"],
        where: {
          userId: { in: followedIds },
          albumId: { notIn: reviewedAlbumIds.length ? reviewedAlbumIds : ["__none__"] },
          rating: { gte: 4 },
        },
        _avg: { rating: true },
        _count: { rating: true },
        orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
        take: 10,
      });

      const albums = await prisma.album.findMany({
        where: { id: { in: recs.map((r) => r.albumId) } },
      });

      return NextResponse.json(
        recs.map((r) => ({
          album: albums.find((a) => a.id === r.albumId)!,
          avgRating: r._avg.rating,
          reviewCount: r._count.rating,
        })).filter((r) => r.album)
      );
    }
  }

  // Fallback: use user's saved genre preferences if set
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteGenres: true },
    });
    if (user?.favoriteGenres) {
      const genres = user.favoriteGenres.split(",");
      const genreResults = await Promise.all(
        genres.map((g) => searchAlbums(g).catch(() => []))
      );
      const seen = new Set<string>();
      const genreAlbums = genreResults.flat().filter((a) => {
        if (seen.has(a.id) || !a.images?.[0]?.url) return false;
        seen.add(a.id);
        return true;
      }).map((a) => ({
        album: {
          id: a.id, spotifyId: a.id,
          title: a.name,
          artist: a.artists.map((x) => x.name).join(", "),
          artwork: a.images[0].url,
          year: a.release_date ? parseInt(a.release_date) : null,
        },
        avgRating: null,
        reviewCount: 0,
      }));
      if (genreAlbums.length > 0) return NextResponse.json(genreAlbums);
    }
  }

  // Fallback: underground genre discovery from Spotify
  try {
    const underground = await getUndergroundAlbums();
    if (underground.length > 0) return NextResponse.json(underground);
  } catch {}

  // Last resort: top-rated in DB
  const top = await prisma.review.groupBy({
    by: ["albumId"],
    _avg: { rating: true },
    _count: { rating: true },
    having: { rating: { _count: { gte: 1 } } },
    orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
    take: 10,
  });

  const albums = await prisma.album.findMany({
    where: { id: { in: top.map((r) => r.albumId) } },
  });

  return NextResponse.json(
    top.map((r) => ({
      album: albums.find((a) => a.id === r.albumId)!,
      avgRating: r._avg.rating,
      reviewCount: r._count.rating,
    })).filter((r) => r.album)
  );
}
