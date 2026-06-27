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
  // Only people you follow — never your own activity (guards against a self-follow row).
  const ids = followed.map((f) => f.followingId).filter((id) => id !== userId);
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

// A comment on an album (treated as a reply to that album's reviews).
export interface CommentActivity {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
}

export type ActivityItem =
  | { kind: "review"; createdAt: string; review: ReturnType<typeof toDisplayFeed>[number] }
  | { kind: "thread"; createdAt: string; thread: ThreadActivity }
  | { kind: "reply"; createdAt: string; reply: ReplyActivity }
  | { kind: "comment"; createdAt: string; comment: CommentActivity };

// Merge a set of users' reviews, discussion threads, and discussion replies into
// one activity stream, most recent first. viewerId reflects like-votes on reviews.
async function getActivity(userIds: string[] | null, viewerId: string | undefined, take: number): Promise<ActivityItem[]> {
  if (userIds && userIds.length === 0) return [];
  const where = userIds ? { userId: { in: userIds } } : {};
  const [reviews, threads, replies, comments] = await Promise.all([
    prisma.review.findMany({ where, include: feedInclude, orderBy: { createdAt: "desc" }, take }),
    prisma.thread.findMany({
      where,
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
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, username: true, avatar: true } } },
    }),
  ]);

  // Comments only store the album's spotifyId — look up album metadata for context.
  const albumIds = [...new Set(comments.map((c) => c.albumSpotifyId))];
  const albums = albumIds.length
    ? await prisma.album.findMany({ where: { spotifyId: { in: albumIds } }, select: { spotifyId: true, title: true, artist: true, artwork: true } })
    : [];
  const albumMap = new Map(albums.map((a) => [a.spotifyId, a]));

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
  const commentItems: ActivityItem[] = comments.map((c) => {
    const a = albumMap.get(c.albumSpotifyId);
    return {
      kind: "comment",
      createdAt: c.createdAt.toISOString(),
      comment: {
        id: c.id, body: c.body, createdAt: c.createdAt.toISOString(),
        user: c.user,
        album: { spotifyId: c.albumSpotifyId, title: a?.title ?? "an album", artist: a?.artist ?? "", artwork: a?.artwork ?? null },
      },
    };
  });

  return [...reviewItems, ...threadItems, ...replyItems, ...commentItems]
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
