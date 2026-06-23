import { prisma } from "@/lib/prisma";

// Friends' Activity feed: a user's own + followed users' reviews (most recent
// first); for logged-out visitors, the most recent reviews site-wide.
export async function getFeed(userId?: string, take = 20) {
  const include = {
    user: { select: { id: true, username: true, avatar: true } },
    album: true,
    likes: { select: { value: true, userId: true } },
  } as const;

  if (!userId) {
    return prisma.review.findMany({ include, orderBy: { createdAt: "desc" }, take });
  }
  const followed = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = [userId, ...followed.map((f) => f.followingId)];
  return prisma.review.findMany({
    where: { userId: { in: ids } },
    include,
    orderBy: { createdAt: "desc" },
    take,
  });
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
