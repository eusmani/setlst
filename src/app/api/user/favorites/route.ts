import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface FavoriteAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { albums } = await req.json();
  if (!Array.isArray(albums) || albums.length > 5) {
    return NextResponse.json({ error: "Provide up to 5 albums" }, { status: 400 });
  }

  const clean: FavoriteAlbum[] = albums
    .filter((a) => a && a.spotifyId && a.title && a.artist)
    .slice(0, 5)
    .map((a) => ({
      spotifyId: a.spotifyId,
      title: a.title,
      artist: a.artist,
      artwork: a.artwork ?? null,
    }));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { topAlbums: JSON.stringify(clean) },
  });

  return NextResponse.json({ ok: true, albums: clean });
}
