import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUsername } = await req.json();
  const target = await prisma.user.findUnique({ where: { username: targetUsername } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === session.user.id)
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false, requested: false });
  }

  // Private accounts: create / cancel a follow request instead of following directly.
  if (target.isPrivate) {
    const pending = await prisma.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId: session.user.id, targetId: target.id } },
    });
    if (pending) {
      await prisma.followRequest.delete({ where: { id: pending.id } });
      return NextResponse.json({ following: false, requested: false });
    }
    await prisma.followRequest.create({ data: { requesterId: session.user.id, targetId: target.id } });
    return NextResponse.json({ following: false, requested: true });
  }

  await prisma.follow.create({ data: { followerId: session.user.id, followingId: target.id } });
  return NextResponse.json({ following: true, requested: false });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      followers: { include: { follower: { select: { id: true, username: true, avatar: true, bio: true } } } },
      following: { include: { following: { select: { id: true, username: true, avatar: true, bio: true } } } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isFollowing = session
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
      }))
    : false;

  return NextResponse.json({
    followers: user.followers.map((f) => f.follower),
    following: user.following.map((f) => f.following),
    isFollowing,
  });
}
