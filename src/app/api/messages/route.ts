import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSel = { id: true, username: true, avatar: true };

// GET /api/messages → your conversations (latest message + unread count per partner).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });
  const me = session.user.id;

  const msgs = await prisma.directMessage.findMany({
    where: { OR: [{ fromId: me }, { toId: me }] },
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
    lastBody: c.last.body ?? (c.last.threadId ? "Shared a discussion" : ""),
    lastAt: c.last.createdAt.toISOString(),
    fromMe: c.last.fromId === me,
    unread: c.unread,
  }));
  return NextResponse.json(list);
}

// POST /api/messages  { toUsername, body?, threadId? } → send a direct message.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toUsername, body, threadId } = await req.json();
  const text = String(body ?? "").trim();
  if (!toUsername || (!text && !threadId)) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const to = await prisma.user.findUnique({ where: { username: String(toUsername).toLowerCase() }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (to.id === session.user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const msg = await prisma.directMessage.create({
    data: { fromId: session.user.id, toId: to.id, body: text || null, threadId: threadId ?? null },
    include: { from: { select: userSel }, reactions: { select: { emoji: true, userId: true } } },
  });
  return NextResponse.json({
    id: msg.id, body: msg.body, threadId: msg.threadId, createdAt: msg.createdAt.toISOString(),
    fromMe: true, reactions: [],
  });
}
