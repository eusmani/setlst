import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownsCrate(crateId: string, userId: string) {
  const c = await prisma.crate.findUnique({ where: { id: crateId }, select: { userId: true } });
  return !!c && c.userId === userId;
}

// POST /api/crates/albums  { crateId, spotifyId, title, artist, artwork?, year? }  → add album.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { crateId, spotifyId, title, artist, artwork, year } = await req.json();
  if (!crateId || !spotifyId || !title || !artist) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!(await ownsCrate(crateId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.crateAlbum.upsert({
    where: { crateId_spotifyId: { crateId, spotifyId } },
    update: { title, artist, artwork: artwork ?? null, year: year ?? null },
    create: { crateId, spotifyId, title, artist, artwork: artwork ?? null, year: year ?? null },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/crates/albums?crateId=…&spotifyId=…  → remove album from a crate.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const crateId = req.nextUrl.searchParams.get("crateId");
  const spotifyId = req.nextUrl.searchParams.get("spotifyId");
  if (!crateId || !spotifyId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
  if (!(await ownsCrate(crateId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.crateAlbum.deleteMany({ where: { crateId, spotifyId } });
  return NextResponse.json({ ok: true });
}
