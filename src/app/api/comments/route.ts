import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/rateLimit";
import { autoReport, blockedIds, canPost, notFromBlocked, screenText } from "@/lib/moderation";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json([], { status: 400 });

  const session = await auth();
  const hidden = await blockedIds(session?.user.id);

  const comments = await prisma.comment.findMany({
    // Hide comments from blocked users and anything moderation has removed.
    where: { albumSpotifyId: albumId, removedAt: null, ...notFromBlocked(hidden) },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      likes: session ? { where: { userId: session.user.id }, select: { id: true } } : false,
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
      likeCount: c._count.likes,
      likedByMe: Array.isArray(c.likes) ? c.likes.length > 0 : false,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Throttle comment spam: 10 per minute per user.
  const limited = checkLimit("comment", session.user.id, 10, 60 * 1000);
  if (limited) return limited;

  const posting = await canPost(session.user.id);
  if (!posting.allowed) return NextResponse.json({ error: posting.reason }, { status: 403 });

  const { albumSpotifyId, body } = await req.json();
  if (!albumSpotifyId || !body?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (body.length > 1000) {
    return NextResponse.json({ error: "Comment too long" }, { status: 400 });
  }

  // Guideline 1.2: objectionable content is rejected before it is ever stored.
  const screened = screenText(body);
  if (!screened.ok) {
    if (screened.escalate) {
      await autoReport({
        reporterId: session.user.id,
        contentType: "comment",
        contentId: `blocked:${Date.now()}`,
        category: screened.category!,
        snapshot: body,
      });
    }
    return NextResponse.json({ error: screened.message }, { status: 422 });
  }

  const comment = await prisma.comment.create({
    data: { albumSpotifyId, body: body.trim(), userId: session.user.id },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });

  return NextResponse.json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
    likeCount: 0,
    likedByMe: false,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
