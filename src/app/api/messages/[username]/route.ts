import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedBetween } from "@/lib/moderation";

// GET /api/messages/[username] → the full conversation with a user (marks incoming
// messages read). Returns partner info + messages (oldest first) with reactions.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json(null, { status: 401 });
  const me = session.user.id;
  const { username } = await params;

  const partner = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, username: true, avatar: true } });
  if (!partner) return NextResponse.json(null, { status: 404 });

  // Blocked in either direction: the thread is inaccessible, not just hidden.
  if (await isBlockedBetween(me, partner.id)) {
    return NextResponse.json({ error: "This conversation is unavailable." }, { status: 403 });
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      removedAt: null,
      OR: [
        { fromId: me, toId: partner.id },
        { fromId: partner.id, toId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      reactions: { select: { emoji: true, userId: true } },
      thread: { select: { id: true, title: true, albumTitle: true, albumArtist: true } },
    },
  });

  // Mark the partner's messages to me as read.
  await prisma.directMessage.updateMany({
    where: { fromId: partner.id, toId: me, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    partner,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      fromMe: m.fromId === me,
      thread: m.thread ? { id: m.thread.id, title: m.thread.title, album: `${m.thread.albumTitle} · ${m.thread.albumArtist}` } : null,
      album: m.albumSpotifyId ? { spotifyId: m.albumSpotifyId, title: m.albumTitle, artist: m.albumArtist, artwork: m.albumArtwork } : null,
      reactions: m.reactions.map((r) => ({ emoji: r.emoji, mine: r.userId === me })),
    })),
  });
}
