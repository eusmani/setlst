import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: session.user.id, commentId } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    const count = await prisma.commentLike.count({ where: { commentId } });
    return NextResponse.json({ liked: false, count });
  }

  await prisma.commentLike.create({ data: { userId: session.user.id, commentId } });
  const count = await prisma.commentLike.count({ where: { commentId } });
  return NextResponse.json({ liked: true, count });
}
