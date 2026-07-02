import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ThreadView from "./ThreadView";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          votes: { select: { value: true, userId: true } },
        },
      },
    },
  });

  if (!thread) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">Discussion not found.</p>
        <Link href="/" className="text-sm text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const [likeCount, dislikeCount, myVoteRow] = await Promise.all([
    prisma.threadVote.count({ where: { threadId: id, value: 1 } }),
    prisma.threadVote.count({ where: { threadId: id, value: -1 } }),
    viewerId ? prisma.threadVote.findUnique({ where: { userId_threadId: { userId: viewerId, threadId: id } } }) : null,
  ]);

  const data = {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    images: (() => { try { const g = JSON.parse(thread.images ?? "[]"); return Array.isArray(g) ? g : []; } catch { return []; } })(),
    createdAt: thread.createdAt.toISOString(),
    album: { spotifyId: thread.albumSpotifyId, title: thread.albumTitle, artist: thread.albumArtist, artwork: thread.albumArtwork },
    user: thread.user,
    replies: thread.replies.map((r) => ({
      id: r.id, body: r.body, createdAt: r.createdAt.toISOString(), user: r.user, parentId: r.parentId,
      likeCount: r.votes.filter((v) => v.value === 1).length,
      dislikeCount: r.votes.filter((v) => v.value === -1).length,
      myVote: viewerId ? (r.votes.find((v) => v.userId === viewerId)?.value ?? 0) : 0,
    })),
    likeCount,
    dislikeCount,
    myVote: myVoteRow?.value ?? 0,
  };

  return <ThreadView thread={data} currentUserId={viewerId ?? null} isLoggedIn={!!session} />;
}
