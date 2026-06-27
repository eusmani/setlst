import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/threads/replies/vote  { replyId, value: 1 | -1 }  → toggle like/dislike.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { replyId, value } = await req.json();
  if (!replyId || (value !== 1 && value !== -1)) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const existing = await prisma.replyVote.findUnique({
    where: { userId_replyId: { userId: session.user.id, replyId } },
  });
  if (existing) {
    if (existing.value === value) await prisma.replyVote.delete({ where: { id: existing.id } });
    else await prisma.replyVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.replyVote.create({ data: { userId: session.user.id, replyId, value } });
  }

  const [likeCount, dislikeCount, mine] = await Promise.all([
    prisma.replyVote.count({ where: { replyId, value: 1 } }),
    prisma.replyVote.count({ where: { replyId, value: -1 } }),
    prisma.replyVote.findUnique({ where: { userId_replyId: { userId: session.user.id, replyId } } }),
  ]);
  return NextResponse.json({ likeCount, dislikeCount, myVote: mine?.value ?? 0 });
}
