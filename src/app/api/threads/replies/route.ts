import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoReport, canPost, isBlockedBetween, screenText } from "@/lib/moderation";

// POST /api/threads/replies  { threadId, body }  → add a reply.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posting = await canPost(session.user.id);
  if (!posting.allowed) return NextResponse.json({ error: posting.reason }, { status: 403 });

  const { threadId, body, parentId } = await req.json();
  const b = String(body ?? "").trim();
  if (!threadId || !b) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (b.length > 5000) return NextResponse.json({ error: "Reply too long" }, { status: 400 });

  // Guideline 1.2: screen the reply before it is stored.
  const screened = screenText(b);
  if (!screened.ok) {
    if (screened.escalate) {
      await autoReport({
        reporterId: session.user.id,
        contentType: "reply",
        contentId: `blocked:${Date.now()}`,
        category: screened.category!,
        snapshot: b,
      });
    }
    return NextResponse.json({ error: screened.message }, { status: 422 });
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, userId: true, removedAt: true },
  });
  if (!thread || thread.removedAt) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  // You can't reply into a discussion started by someone you've blocked (or who
  // has blocked you).
  if (await isBlockedBetween(session.user.id, thread.userId)) {
    return NextResponse.json({ error: "You can't reply to this discussion." }, { status: 403 });
  }

  // Validate the parent reply belongs to this thread (reply-to-reply).
  let parent: string | null = null;
  if (parentId) {
    const p = await prisma.threadReply.findUnique({ where: { id: parentId }, select: { threadId: true } });
    if (p && p.threadId === threadId) parent = parentId;
  }

  const reply = await prisma.threadReply.create({
    data: { threadId, body: b, userId: session.user.id, parentId: parent },
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
