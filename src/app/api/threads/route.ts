import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSelect = { id: true, username: true, avatar: true } as const;

// GET /api/threads?album=<spotifyId>  → threads on an album (newest first).
// GET /api/threads?id=<id>            → a single thread with replies.
export async function GET(req: NextRequest) {
  const album = req.nextUrl.searchParams.get("album");
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const thread = await prisma.thread.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: userSelect } } },
      },
    });
    return NextResponse.json(thread);
  }

  if (album) {
    const threads = await prisma.thread.findMany({
      where: { albumSpotifyId: album },
      orderBy: { createdAt: "desc" },
      include: { user: { select: userSelect }, _count: { select: { replies: true } } },
    });
    return NextResponse.json(threads);
  }

  return NextResponse.json([]);
}

// POST /api/threads  { albumSpotifyId, albumTitle, albumArtist, albumArtwork?, title, body }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { albumSpotifyId, albumTitle, albumArtist, albumArtwork, title, body } = await req.json();
  const t = String(title ?? "").trim();
  const b = String(body ?? "").trim();
  if (!albumSpotifyId || !albumTitle || !albumArtist || !t || !b) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (t.length > 140) return NextResponse.json({ error: "Title too long" }, { status: 400 });
  if (b.length > 5000) return NextResponse.json({ error: "Post too long" }, { status: 400 });

  const thread = await prisma.thread.create({
    data: {
      albumSpotifyId, albumTitle, albumArtist, albumArtwork: albumArtwork ?? null,
      title: t, body: b, userId: session.user.id,
    },
    include: { user: { select: userSelect }, _count: { select: { replies: true } } },
  });
  return NextResponse.json(thread);
}

// DELETE /api/threads?id=<id>  → delete a thread (author only).
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const thread = await prisma.thread.findUnique({ where: { id }, select: { userId: true } });
  if (!thread || thread.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.thread.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
