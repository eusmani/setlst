import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inbox  → discussions shared with you (and marks them read).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const shares = await prisma.threadShare.findMany({
    where: { toUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fromUser: { select: { username: true, avatar: true } },
      thread: { select: { id: true, title: true, albumTitle: true, albumArtist: true, albumArtwork: true } },
    },
  });

  // Mark unread as read once viewed.
  await prisma.threadShare.updateMany({
    where: { toUserId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json(shares);
}

// HEAD-ish count of unread shares, via ?count=1
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ count: 0 }, { status: 401 });
  const count = await prisma.threadShare.count({ where: { toUserId: session.user.id, read: false } });
  return NextResponse.json({ count });
}
