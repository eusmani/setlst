import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/threads/replies  { threadId, body }  → add a reply.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, body } = await req.json();
  const b = String(body ?? "").trim();
  if (!threadId || !b) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (b.length > 5000) return NextResponse.json({ error: "Reply too long" }, { status: 400 });

  const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const reply = await prisma.threadReply.create({
    data: { threadId, body: b, userId: session.user.id },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return NextResponse.json(reply);
}

// DELETE /api/threads/replies?id=<id>  → delete a reply (author only).
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const reply = await prisma.threadReply.findUnique({ where: { id }, select: { userId: true } });
  if (!reply || reply.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.threadReply.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
