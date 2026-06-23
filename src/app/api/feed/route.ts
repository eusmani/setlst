import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const include = {
    user: { select: { id: true, username: true, avatar: true } },
    album: true,
    _count: { select: { likes: true } },
  } as const;

  if (!session) {
    return NextResponse.json(
      await prisma.review.findMany({ include, orderBy: { createdAt: "desc" }, take: 30 })
    );
  }

  const followed = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const ids = [session.user.id, ...followed.map((f) => f.followingId)];

  return NextResponse.json(
    await prisma.review.findMany({
      where: { userId: { in: ids } },
      include,
      orderBy: { createdAt: "desc" },
      take: 30,
    })
  );
}
