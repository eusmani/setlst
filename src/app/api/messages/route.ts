import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockedIds, canPost, isBlockedBetween, screenText, autoReport } from "@/lib/moderation";

const userSel = { id: true, username: true, avatar: true };

// GET /api/messages → your conversations (latest message + unread count per partner).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });
  const me = session.user.id;

  // Conversations with blocked users disappear from the inbox entirely, and
  // moderator-removed messages never surface.
  const hidden = await blockedIds(me);

  const msgs = await prisma.directMessage.findMany({
    where: {
      OR: [{ fromId: me }, { toId: me }],
      removedAt: null,
      ...(hidden.length ? { NOT: [{ fromId: { in: hidden } }, { toId: { in: hidden } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { from: { select: userSel }, to: { select: userSel } },
  });

  const convos = new Map<string, { user: { id: string; username: string; avatar: string | null }; last: (typeof msgs)[number]; unread: number }>();
  for (const m of msgs) {
    const partner = m.fromId === me ? m.to : m.from;
    if (!convos.has(partner.id)) convos.set(partner.id, { user: partner, last: m, unread: 0 });
    if (m.toId === me && !m.readAt) convos.get(partner.id)!.unread++;
  }

  const list = [...convos.values()].map((c) => ({
    username: c.user.username,
    avatar: c.user.avatar,
    lastBody: c.last.body ?? (c.last.threadId ? "Shared a discussion" : c.last.albumSpotifyId ? "Shared an album" : ""),
    lastAt: c.last.createdAt.toISOString(),
    fromMe: c.last.fromId === me,
    unread: c.unread,
  }));
  return NextResponse.json(list);
}

// POST /api/messages
//   { toUsername, body }                          → send a text message (one person)
//   { toUsernames:[...], album|threadId }          → share an album/discussion to many
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = session.user.id;

  const posting = await canPost(me);
  if (!posting.allowed) return NextResponse.json({ error: posting.reason }, { status: 403 });

  const { toUsername, toUsernames, body, threadId, album } = await req.json();
  const text = String(body ?? "").trim();

  // Guideline 1.2: screen message text before it is stored.
  const screened = screenText(text);
  if (!screened.ok) {
    if (screened.escalate) {
      await autoReport({
        reporterId: me,
        contentType: "message",
        contentId: `blocked:${Date.now()}`,
        category: screened.category!,
        snapshot: text,
      });
    }
    return NextResponse.json({ error: screened.message }, { status: 422 });
  }

  const hidden = await blockedIds(me);

  // Share an album or discussion to one or more recipients.
  if (album?.spotifyId || threadId) {
    const names = (Array.isArray(toUsernames) ? toUsernames : toUsername ? [toUsername] : [])
      .map((n: string) => String(n).toLowerCase());
    if (names.length === 0) return NextResponse.json({ error: "No recipients" }, { status: 400 });
    const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true } });
    const recips = users.filter((u) => u.id !== me && !hidden.includes(u.id));
    if (recips.length === 0) return NextResponse.json({ error: "No recipients" }, { status: 400 });
    await prisma.directMessage.createMany({
      data: recips.map((u) => ({
        fromId: me, toId: u.id,
        body: text || null,
        threadId: threadId ?? null,
        albumSpotifyId: album?.spotifyId ?? null,
        albumTitle: album?.title ?? null,
        albumArtist: album?.artist ?? null,
        albumArtwork: album?.artwork ?? null,
      })),
    });
    return NextResponse.json({ ok: true, sent: recips.length });
  }

  // Plain text message to one person (chat composer).
  if (!toUsername || !text) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Message too long" }, { status: 400 });
  const to = await prisma.user.findUnique({ where: { username: String(toUsername).toLowerCase() }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (to.id === me) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  // A block stops messages in both directions — the sender is told the message
  // can't be delivered, without revealing who blocked whom.
  if (await isBlockedBetween(me, to.id)) {
    return NextResponse.json({ error: "You can't message this person." }, { status: 403 });
  }

  const msg = await prisma.directMessage.create({
    data: { fromId: me, toId: to.id, body: text },
  });
  return NextResponse.json({
    id: msg.id, body: msg.body, threadId: null, album: null, createdAt: msg.createdAt.toISOString(),
    fromMe: true, reactions: [],
  });
}
