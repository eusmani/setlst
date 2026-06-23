import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, value } = await req.json();
  if (!reviewId || (value !== 1 && value !== -1)) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_reviewId: { userId: session.user.id, reviewId } },
  });

  if (existing) {
    if (existing.value === value) {
      // clicking the same vote again removes it
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.update({ where: { id: existing.id }, data: { value } });
    }
  } else {
    await prisma.like.create({ data: { userId: session.user.id, reviewId, value } });
  }

  const [likes, dislikes, mine] = await Promise.all([
    prisma.like.count({ where: { reviewId, value: 1 } }),
    prisma.like.count({ where: { reviewId, value: -1 } }),
    prisma.like.findUnique({ where: { userId_reviewId: { userId: session.user.id, reviewId } } }),
  ]);

  return NextResponse.json({ likeCount: likes, dislikeCount: dislikes, myVote: mine?.value ?? 0 });
}
