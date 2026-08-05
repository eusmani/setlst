import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { blockedIds } from "@/lib/moderation";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Blocked people are unfindable in search, in both directions.
  const session = await auth();
  const hidden = await blockedIds(session?.user.id);

  const users = await prisma.user.findMany({
    where: {
      ...(hidden.length ? { id: { notIn: hidden } } : {}),
      ...(q ? { OR: [{ username: { contains: q } }, { bio: { contains: q } }] } : {}),
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      _count: { select: { reviews: true, followers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(users);
}
