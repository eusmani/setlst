import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/threads/share  → people you can share with (those you follow).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });
  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { following: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(follows.map((f) => f.following));
}

// POST /api/threads/share  { threadId, toUserIds: string[] }  → send to friends in-app.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, toUserIds } = await req.json();
  if (!threadId || !Array.isArray(toUserIds) || toUserIds.length === 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const recipients = (toUserIds as string[]).filter((id) => id && id !== session.user.id);
  await prisma.threadShare.createMany({
    data: recipients.map((toUserId) => ({ threadId, fromUserId: session.user.id, toUserId })),
  });
  // Also drop the shared discussion into the recipients' DM inbox.
  await prisma.directMessage.createMany({
    data: recipients.map((toUserId) => ({ fromId: session.user.id, toId: toUserId, threadId })),
  });
  return NextResponse.json({ ok: true, sent: recipients.length });
}
