import { prisma } from "@/lib/prisma";

const feedInclude = {
  user: { select: { id: true, username: true, avatar: true } },
  album: true,
  likes: { select: { value: true, userId: true } },
} as const;

// Home feed: a user's own + followed users' reviews (most recent first); for
// logged-out visitors, the most recent reviews site-wide.
export async function getFeed(userId?: string, take = 20) {
  if (!userId) {
    return prisma.review.findMany({ include: feedInclude, orderBy: { createdAt: "desc" }, take });
  }
  const followed = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = [userId, ...followed.map((f) => f.followingId)];
  return prisma.review.findMany({
    where: { userId: { in: ids } },
    include: feedInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

// Reviews from people the user follows (excluding their own).
export async function getFriendsFeed(userId: string, take = 30) {
  const followed = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = followed.map((f) => f.followingId);
  if (ids.length === 0) return [];
  return prisma.review.findMany({
    where: { userId: { in: ids } },
    include: feedInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

// A single user's own reviews.
export async function getUserFeed(userId: string, take = 30) {
  return prisma.review.findMany({
    where: { userId },
    include: feedInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export interface AddedAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

// Albums a user has "added" — reviewed or saved to their listen-list — most
// recent first, de-duped by spotifyId (keeping the most recent action).
export async function getUserAddedAlbums(userId: string, take = 24): Promise<AddedAlbum[]> {
  const [reviews, saved] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: { createdAt: true, album: { select: { spotifyId: true, title: true, artist: true, artwork: true, year: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.savedAlbum.findMany({
      where: { userId },
      select: { createdAt: true, spotifyId: true, title: true, artist: true, artwork: true, year: true },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const merged = [
    ...reviews.map((r) => ({ at: r.createdAt.getTime(), a: r.album })),
    ...saved.map((s) => ({ at: s.createdAt.getTime(), a: { spotifyId: s.spotifyId, title: s.title, artist: s.artist, artwork: s.artwork, year: s.year } })),
  ].sort((x, y) => y.at - x.at);

  const seen = new Set<string>();
  const out: AddedAlbum[] = [];
  for (const { a } of merged) {
    if (seen.has(a.spotifyId)) continue;
    seen.add(a.spotifyId);
    out.push({ spotifyId: a.spotifyId, title: a.title, artist: a.artist, artwork: a.artwork ?? null, year: a.year ?? null });
    if (out.length >= take) break;
  }
  return out;
}

type FeedItem = Awaited<ReturnType<typeof getFeed>>[number];

// Serialize feed rows into the shape ReviewCard expects (dates → strings,
// like/dislike tallies, the current user's vote).
export function toDisplayFeed(feed: FeedItem[], userId?: string) {
  return feed.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    album: { ...r.album, artwork: r.album.artwork ?? null },
    likeCount: r.likes.filter((l) => l.value === 1).length,
    dislikeCount: r.likes.filter((l) => l.value === -1).length,
    myVote: userId ? (r.likes.find((l) => l.userId === userId)?.value ?? 0) : 0,
  }));
}
