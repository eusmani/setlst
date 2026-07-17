import { NextRequest, NextResponse } from "next/server";
import { resolveAlbumCover } from "@/lib/spotify";

// Canonical album cover for a KNOWN (title, artist) pair, resolved from the real
// Spotify catalog. Used by the "On this day" anniversary banner, which lists
// exact albums and must never show a same-named/remix/tribute cover.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const artist = req.nextUrl.searchParams.get("artist");
  if (!title || !artist) return NextResponse.json({ cover: null });
  try {
    const cover = await resolveAlbumCover(title, artist);
    return NextResponse.json({ cover });
  } catch {
    return NextResponse.json({ cover: null });
  }
}
