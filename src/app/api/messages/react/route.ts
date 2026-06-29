import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/messages/react  { messageId, emoji } → toggle your emoji reaction on a
// message (one reaction per user per message). Returns the message's reactions.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = session.user.id;

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Only participants can react.
  const msg = await prisma.directMessage.findUnique({ where: { id: messageId }, select: { fromId: true, toId: true } });
  if (!msg || (msg.fromId !== me && msg.toId !== me)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.messageReaction.findUnique({ where: { messageId_userId: { messageId, userId: me } } });
  if (existing && existing.emoji === emoji) {
    await prisma.messageReaction.delete({ where: { id: existing.id } }); // tap same emoji to remove
  } else if (existing) {
    await prisma.messageReaction.update({ where: { id: existing.id }, data: { emoji } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: me, emoji } });
  }

  const reactions = await prisma.messageReaction.findMany({ where: { messageId }, select: { emoji: true, userId: true } });
  return NextResponse.json({ reactions: reactions.map((r) => ({ emoji: r.emoji, mine: r.userId === me })) });
}
