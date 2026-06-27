import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/threads/vote  { threadId, value: 1 | -1 }  → toggle like/dislike.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, value } = await req.json();
  if (!threadId || (value !== 1 && value !== -1)) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const existing = await prisma.threadVote.findUnique({
    where: { userId_threadId: { userId: session.user.id, threadId } },
  });
  if (existing) {
    if (existing.value === value) await prisma.threadVote.delete({ where: { id: existing.id } });
    else await prisma.threadVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.threadVote.create({ data: { userId: session.user.id, threadId, value } });
  }

  const [likeCount, dislikeCount, mine] = await Promise.all([
    prisma.threadVote.count({ where: { threadId, value: 1 } }),
    prisma.threadVote.count({ where: { threadId, value: -1 } }),
    prisma.threadVote.findUnique({ where: { userId_threadId: { userId: session.user.id, threadId } } }),
  ]);
  return NextResponse.json({ likeCount, dislikeCount, myVote: mine?.value ?? 0 });
}
