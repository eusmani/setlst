import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artist } = await req.json();
  if (!artist || typeof artist !== "string")
    return NextResponse.json({ error: "Missing artist" }, { status: 400 });
  const name = artist.trim();

  const existing = await prisma.artistFollow.findUnique({
    where: { userId_artist: { userId: session.user.id, artist: name } },
  });

  if (existing) {
    await prisma.artistFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }
  await prisma.artistFollow.create({ data: { userId: session.user.id, artist: name } });
  return NextResponse.json({ following: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const artist = req.nextUrl.searchParams.get("artist");
  if (!artist) return NextResponse.json({ error: "Missing artist" }, { status: 400 });
  const name = artist.trim();

  const [followerCount, mine] = await Promise.all([
    prisma.artistFollow.count({ where: { artist: name } }),
    session
      ? prisma.artistFollow.findUnique({
          where: { userId_artist: { userId: session.user.id, artist: name } },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ following: !!mine, followerCount });
}
