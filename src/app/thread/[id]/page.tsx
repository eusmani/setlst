import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ThreadView from "./ThreadView";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  });

  if (!thread) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">Discussion not found.</p>
        <Link href="/" className="text-xs text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const data = {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    createdAt: thread.createdAt.toISOString(),
    album: { spotifyId: thread.albumSpotifyId, title: thread.albumTitle, artist: thread.albumArtist, artwork: thread.albumArtwork },
    user: thread.user,
    replies: thread.replies.map((r) => ({
      id: r.id, body: r.body, createdAt: r.createdAt.toISOString(), user: r.user,
    })),
  };

  return <ThreadView thread={data} currentUserId={session?.user?.id ?? null} isLoggedIn={!!session} />;
}
