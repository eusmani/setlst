import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The signed-in user's most recently reviewed albums.
//
// The "Recently Viewed" strip on /search merges this with the per-device click
// history kept in localStorage: that history covers albums you opened but never
// reviewed, while this covers albums you reviewed from any device. Signed-out
// visitors just get the local half.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: session.user.id },
      // updatedAt, not createdAt — editing a review counts as recent activity.
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        updatedAt: true,
        album: { select: { spotifyId: true, title: true, artist: true, artwork: true, year: true } },
      },
    });
    return NextResponse.json(
      reviews.map((r) => ({
        spotifyId: r.album.spotifyId,
        title: r.album.title,
        artist: r.album.artist,
        artwork: r.album.artwork,
        year: r.album.year,
        at: r.updatedAt.getTime(),
        reviewed: true,
      })),
    );
  } catch {
    // The strip is a nicety — never let it surface an error on /search.
    return NextResponse.json([]);
  }
}
