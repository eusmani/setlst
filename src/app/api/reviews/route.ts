import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/rateLimit";
import { autoReport, blockedIds, canPost, screenText } from "@/lib/moderation";

export async function GET(req: NextRequest) {
  const albumId = req.nextUrl.searchParams.get("albumId");
  const username = req.nextUrl.searchParams.get("username");
  const session = await auth();
  const hidden = await blockedIds(session?.user.id);

  // Reviews from blocked users, and reviews moderation has removed, stay hidden.
  const where: Record<string, unknown> = { removedAt: null };
  if (hidden.length) where.userId = { notIn: hidden };
  if (albumId) where.album = { spotifyId: albumId };
  if (username) where.user = { username };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      album: true,
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(reviews);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spotifyId = req.nextUrl.searchParams.get("albumId");
  if (!spotifyId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  const album = await prisma.album.findUnique({ where: { spotifyId } });
  if (!album) return NextResponse.json({ ok: true });

  await prisma.review.deleteMany({
    where: { userId: session.user.id, albumId: album.id },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Throttle review spam: 20 writes per minute per user.
  const limited = checkLimit("review", session.user.id, 20, 60 * 1000);
  if (limited) return limited;

  const posting = await canPost(session.user.id);
  if (!posting.allowed) return NextResponse.json({ error: posting.reason }, { status: 403 });

  const { spotifyId, title, artist, artwork, year, genres, rating, subject, body,
          favoriteSong, leastFavoriteSong, showSongs } = await req.json();
  if (!spotifyId || !title || !artist || rating == null)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (rating < 1 || rating > 10 || (rating * 2) % 1 !== 0)
    return NextResponse.json({ error: "Rating must be 1–10 in 0.5 steps" }, { status: 400 });

  // Guideline 1.2: screen every free-text field the reviewer wrote.
  const written = [subject, body, favoriteSong, leastFavoriteSong].filter(Boolean).join("\n");
  const screened = screenText(written);
  if (!screened.ok) {
    if (screened.escalate) {
      await autoReport({
        reporterId: session.user.id,
        contentType: "review",
        contentId: `blocked:${Date.now()}`,
        category: screened.category!,
        snapshot: written,
      });
    }
    return NextResponse.json({ error: screened.message }, { status: 422 });
  }

  const album = await prisma.album.upsert({
    where: { spotifyId },
    update: {},
    create: { spotifyId, title, artist, artwork: artwork ?? null, year: year ?? null, genres: genres ? JSON.stringify(genres) : null },
  });

  const songFields = {
    favoriteSong: favoriteSong || null,
    leastFavoriteSong: leastFavoriteSong || null,
    showSongs: showSongs ?? true,
  };

  const review = await prisma.review.upsert({
    where: { userId_albumId: { userId: session.user.id, albumId: album.id } },
    update: { rating, subject: subject ?? null, body: body ?? null, ...songFields },
    create: { rating, subject: subject ?? null, body: body ?? null, ...songFields, userId: session.user.id, albumId: album.id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      album: true,
    },
  });
  return NextResponse.json(review);
}
