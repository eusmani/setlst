import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSelect = { id: true, username: true, avatar: true } as const;

// GET /api/threads?album=<spotifyId>  → threads on an album (newest first).
// GET /api/threads?id=<id>            → a single thread with replies.
// GET /api/threads?user=<username>    → threads a user created or replied to.
export async function GET(req: NextRequest) {
  const album = req.nextUrl.searchParams.get("album");
  const id = req.nextUrl.searchParams.get("id");
  const username = req.nextUrl.searchParams.get("user");

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

  if (username) {
    const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) return NextResponse.json([]);
    const repliedIds = await prisma.threadReply.findMany({
      where: { userId: u.id }, select: { threadId: true },
    });
    const ids = [...new Set(repliedIds.map((r) => r.threadId))];
    const threads = await prisma.thread.findMany({
      where: { OR: [{ userId: u.id }, { id: { in: ids } }] },
      orderBy: { createdAt: "desc" },
      include: { user: { select: userSelect }, _count: { select: { replies: true } } },
    });
    // Flag whether this user authored each thread (vs. only replied).
    return NextResponse.json(threads.map((t) => ({ ...t, authored: t.userId === u.id })));
  }

  return NextResponse.json([]);
}

// POST /api/threads  { albumSpotifyId, albumTitle, albumArtist, albumArtwork?, title, body }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { albumSpotifyId, albumTitle, albumArtist, albumArtwork, title, body, images } = await req.json();
  const t = String(title ?? "").trim();
  const b = String(body ?? "").trim();
  if (!albumSpotifyId || !albumTitle || !albumArtist || !t || !b) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (t.length > 140) return NextResponse.json({ error: "Title too long" }, { status: 400 });
  if (b.length > 5000) return NextResponse.json({ error: "Post too long" }, { status: 400 });

  // Attached photos — up to 4 resized JPEG/PNG/WebP data URLs (SFW-checked client-side).
  let imagesJson: string | null = null;
  if (Array.isArray(images) && images.length > 0) {
    const valid = images
      .filter((s) => typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(s) && s.length < 3_000_000)
      .slice(0, 4);
    if (valid.length) imagesJson = JSON.stringify(valid);
  }

  const thread = await prisma.thread.create({
    data: {
      albumSpotifyId, albumTitle, albumArtist, albumArtwork: albumArtwork ?? null,
      title: t, body: b, images: imagesJson, userId: session.user.id,
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
