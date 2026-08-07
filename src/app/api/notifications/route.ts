import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockedIds } from "@/lib/moderation";

// Everything that happened *to you* — the Instagram/Letterboxd-style
// notifications inbox, as opposed to the activity feed, which is what other
// people have been doing.
//
// There's no Notification table: rather than write one on every interaction and
// risk it drifting out of step with the source data, this derives the feed from
// the rows that already exist. That costs a handful of indexed queries per load
// and can never disagree with reality.
//
// Sources are limited to rows that carry a timestamp. ThreadVote and ReplyVote
// deliberately have no createdAt, so "liked your discussion" can't be ordered
// and is left out until those columns exist.

export const dynamic = "force-dynamic";

export type NotificationKind =
  | "follow"
  | "follow_request"
  | "reply"
  | "review_like"
  | "comment_like"
  | "thread_share";

interface Notification {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  actor: { username: string; avatar: string | null };
  /** One line of context — a reply's text, the album reviewed, and so on. */
  detail?: string;
  /** Where tapping the row goes. */
  href: string;
}

const PER_SOURCE = 30;
const TOTAL = 60;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ notifications: [] }, { status: 401 });

  const me = session.user.id;
  const hidden = await blockedIds(me);
  const notBlocked = hidden.length ? { notIn: hidden } : undefined;
  const actor = { select: { username: true, avatar: true } };

  // ThreadReply has parentId but no `parent` relation, so replies-to-your-replies
  // are matched by id rather than through a join.
  const myReplyIds = (
    await prisma.threadReply.findMany({ where: { userId: me }, select: { id: true } })
  ).map((r) => r.id);

  const [followers, requests, replies, reviewLikes, commentLikes, shares] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: me, ...(notBlocked ? { followerId: notBlocked } : {}) },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: { follower: actor },
    }),
    prisma.followRequest.findMany({
      where: { targetId: me, ...(notBlocked ? { requesterId: notBlocked } : {}) },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: { requester: actor },
    }),
    // Replies on your discussions, and replies to your replies — but not your
    // own, which would be you notifying yourself.
    prisma.threadReply.findMany({
      where: {
        removedAt: null,
        NOT: { userId: me },
        ...(notBlocked ? { userId: notBlocked } : {}),
        OR: [
          { thread: { userId: me } },
          ...(myReplyIds.length ? [{ parentId: { in: myReplyIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: { user: actor, thread: { select: { id: true, title: true } } },
    }),
    prisma.like.findMany({
      where: {
        review: { userId: me, removedAt: null },
        NOT: { userId: me },
        ...(notBlocked ? { userId: notBlocked } : {}),
      },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: {
        user: actor,
        review: { select: { album: { select: { spotifyId: true, title: true } } } },
      },
    }),
    prisma.commentLike.findMany({
      where: {
        comment: { userId: me, removedAt: null },
        NOT: { userId: me },
        ...(notBlocked ? { userId: notBlocked } : {}),
      },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: { user: actor, comment: { select: { albumSpotifyId: true } } },
    }),
    prisma.threadShare.findMany({
      where: { toUserId: me, ...(notBlocked ? { fromUserId: notBlocked } : {}) },
      orderBy: { createdAt: "desc" }, take: PER_SOURCE,
      include: { fromUser: actor, thread: { select: { id: true, title: true } } },
    }),
  ]);

  const items: Notification[] = [
    ...followers.map((f) => ({
      id: `follow-${f.id}`,
      kind: "follow" as const,
      createdAt: f.createdAt.toISOString(),
      actor: f.follower,
      detail: "started following you",
      href: `/profile/${f.follower.username}`,
    })),
    ...requests.map((r) => ({
      id: `request-${r.id}`,
      kind: "follow_request" as const,
      createdAt: r.createdAt.toISOString(),
      actor: r.requester,
      detail: "wants to follow you",
      href: `/profile/${r.requester.username}`,
    })),
    ...replies.map((r) => ({
      id: `reply-${r.id}`,
      kind: "reply" as const,
      createdAt: r.createdAt.toISOString(),
      actor: r.user,
      detail: r.body.slice(0, 140),
      href: `/thread/${r.thread.id}`,
    })),
    ...reviewLikes.map((l) => ({
      id: `like-${l.id}`,
      kind: "review_like" as const,
      createdAt: l.createdAt.toISOString(),
      actor: l.user,
      detail: l.review.album ? `your review of ${l.review.album.title}` : "your review",
      href: l.review.album ? `/album/${l.review.album.spotifyId}` : "/activity?tab=you",
    })),
    ...commentLikes.map((l) => ({
      id: `commentlike-${l.id}`,
      kind: "comment_like" as const,
      createdAt: l.createdAt.toISOString(),
      actor: l.user,
      detail: "your comment",
      href: `/album/${l.comment.albumSpotifyId}`,
    })),
    ...shares.map((s) => ({
      id: `share-${s.id}`,
      kind: "thread_share" as const,
      createdAt: s.createdAt.toISOString(),
      actor: s.fromUser,
      detail: s.thread?.title ?? "a discussion",
      href: s.thread ? `/thread/${s.thread.id}` : "/activity",
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, TOTAL);

  return NextResponse.json({ notifications: items });
}
