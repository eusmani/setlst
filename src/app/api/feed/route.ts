import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockedIds } from "@/lib/moderation";

export async function GET() {
  const session = await auth();
  const include = {
    user: { select: { id: true, username: true, avatar: true } },
    album: true,
    _count: { select: { likes: true } },
  } as const;

  // Guideline 1.2: never surface moderator-removed content, or anything from a
  // blocked account, in either direction.
  const hidden = await blockedIds(session?.user.id);

  if (!session) {
    return NextResponse.json(
      await prisma.review.findMany({
        where: { removedAt: null },
        include,
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    );
  }

  const followed = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const ids = [session.user.id, ...followed.map((f) => f.followingId)]
    .filter((id) => !hidden.includes(id));

  return NextResponse.json(
    await prisma.review.findMany({
      where: { userId: { in: ids }, removedAt: null },
      include,
      orderBy: { createdAt: "desc" },
      take: 30,
    })
  );
}
