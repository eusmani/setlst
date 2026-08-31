import { prisma } from "@/lib/prisma";
import { blockedIds } from "@/lib/moderation";
import { notDemoAlbum } from "@/lib/demo";

const feedInclude = {
  user: { select: { id: true, username: true, avatar: true } },
  album: true,
  likes: { select: { value: true, userId: true } },
} as const;

// Home feed: a user's own + followed users' reviews (most recent first); for
// logged-out visitors, the most recent reviews site-wide.
async function getFeed(userId?: string, take = 20) {
  // Blocked authors and moderator-removed reviews never reach a feed.
  const hidden = await blockedIds(userId);
  if (!userId) {
    return prisma.review.findMany({
      where: { removedAt: null },
      include: feedInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  }
  const followed = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = [userId, ...followed.map((f) => f.followingId)].filter((id) => !hidden.includes(id));
  return prisma.review.findMany({
    where: { userId: { in: ids }, removedAt: null },
    include: feedInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}


// --- Unified activity (reviews + discussion threads) ---

export interface ThreadActivity {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
  replyCount: number;
}

export interface ReplyActivity {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  thread: { id: string; title: string };
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
}

export type ActivityItem =
  | { kind: "review"; createdAt: string; review: ReturnType<typeof toDisplayFeed>[number] }
  | { kind: "thread"; createdAt: string; thread: ThreadActivity }
  | { kind: "reply"; createdAt: string; reply: ReplyActivity };

// Merge a set of users' reviews, discussion threads, and discussion replies into
// one activity stream, most recent first. viewerId reflects like-votes on reviews.
async function getActivity(userIds: string[] | null, viewerId: string | undefined, take: number): Promise<ActivityItem[]> {
  if (userIds && userIds.length === 0) return [];

  // Hide blocked people in both directions, plus anything moderation removed
  // (App Store guideline 1.2).
  const hidden = await blockedIds(viewerId);
  const visibleIds = userIds?.filter((id) => !hidden.includes(id));
  if (userIds && visibleIds!.length === 0) return [];

  const where = {
    removedAt: null,
    ...(visibleIds ? { userId: { in: visibleIds } } : hidden.length ? { userId: { notIn: hidden } } : {}),
  };

  // The site-wide feed (no userIds — logged out, or "Trending") is a discovery
  // surface, so seeded demo albums are kept out of it for the same reason they're
  // kept out of Popular This Week: they're invented, and presented among real
  // releases they look like generated filler. A feed scoped to specific people
  // still shows them, so the demo account's own activity and anyone following it
  // is unaffected — which is what App Review and the screenshots rely on.
  const global = !visibleIds;
  const reviewWhere = global ? { ...where, album: { spotifyId: notDemoAlbum } } : where;
  const threadWhere = global ? { ...where, albumSpotifyId: notDemoAlbum } : where;

  const [reviews, threads, replies] = await Promise.all([
    prisma.review.findMany({ where: reviewWhere, include: feedInclude, orderBy: { createdAt: "desc" }, take }),
    prisma.thread.findMany({
      where: threadWhere,
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, username: true, avatar: true } }, _count: { select: { replies: true } } },
    }),
    prisma.threadReply.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        thread: { select: { id: true, title: true, albumSpotifyId: true, albumTitle: true, albumArtist: true, albumArtwork: true } },
      },
    }),
  ]);

  const reviewItems: ActivityItem[] = toDisplayFeed(reviews, viewerId).map((r) => ({
    kind: "review", createdAt: r.createdAt, review: r,
  }));
  const threadItems: ActivityItem[] = threads.map((t) => ({
    kind: "thread",
    createdAt: t.createdAt.toISOString(),
    thread: {
      id: t.id, title: t.title, body: t.body, createdAt: t.createdAt.toISOString(),
      user: t.user,
      album: { spotifyId: t.albumSpotifyId, title: t.albumTitle, artist: t.albumArtist, artwork: t.albumArtwork ?? null },
      replyCount: t._count.replies,
    },
  }));
  const replyItems: ActivityItem[] = replies.map((r) => ({
    kind: "reply",
    createdAt: r.createdAt.toISOString(),
    reply: {
      id: r.id, body: r.body, createdAt: r.createdAt.toISOString(),
      user: r.user,
      thread: { id: r.thread.id, title: r.thread.title },
      album: { spotifyId: r.thread.albumSpotifyId, title: r.thread.albumTitle, artist: r.thread.albumArtist, artwork: r.thread.albumArtwork ?? null },
    },
  }));
  return [...reviewItems, ...threadItems, ...replyItems]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, take);
}

// A user's own activity (reviews + threads).
export function getUserActivity(userId: string, take = 30) {
  return getActivity([userId], userId, take);
}

// Activity from people the user follows (never their own).
export async function getFriendsActivity(userId: string, take = 30) {
  const followed = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const ids = followed.map((f) => f.followingId).filter((id) => id !== userId);
  return getActivity(ids, userId, take);
}

// Recent activity site-wide (for logged-out visitors).
export function getRecentActivity(take = 20) {
  return getActivity(null, undefined, take);
}

type FeedItem = Awaited<ReturnType<typeof getFeed>>[number];

// Serialize feed rows into the shape ReviewCard expects (dates → strings,
// like/dislike tallies, the current user's vote).
function toDisplayFeed(feed: FeedItem[], userId?: string) {
  return feed.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    album: { ...r.album, artwork: r.album.artwork ?? null },
    likeCount: r.likes.filter((l) => l.value === 1).length,
    dislikeCount: r.likes.filter((l) => l.value === -1).length,
    myVote: userId ? (r.likes.find((l) => l.userId === userId)?.value ?? 0) : 0,
  }));
}
