import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ username: { contains: q } }, { bio: { contains: q } }] } : {},
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
