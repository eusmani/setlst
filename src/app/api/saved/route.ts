import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  // ?spotifyId=… → { saved: boolean } for a single album
  const spotifyId = req.nextUrl.searchParams.get("spotifyId");
  if (spotifyId) {
    const one = await prisma.savedAlbum.findUnique({
      where: { userId_spotifyId: { userId: session.user.id, spotifyId } },
    });
    return NextResponse.json({ saved: !!one });
  }

  const saved = await prisma.savedAlbum.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(saved);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spotifyId, title, artist, artwork, year } = await req.json();
  if (!spotifyId || !title || !artist) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.savedAlbum.findUnique({
    where: { userId_spotifyId: { userId: session.user.id, spotifyId } },
  });

  if (existing) {
    await prisma.savedAlbum.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedAlbum.create({
    data: { userId: session.user.id, spotifyId, title, artist, artwork: artwork ?? null, year: year ?? null },
  });
  return NextResponse.json({ saved: true });
}
