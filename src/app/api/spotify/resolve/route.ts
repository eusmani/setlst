import { NextRequest, NextResponse } from "next/server";
import { searchAlbums } from "@/lib/spotify";

export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Resolve a title/artist to its real album on Spotify (id, deep link, cover) so
// the New Release bar can be a direct Spotify ad rather than a search link.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") ?? "";
  const artist = req.nextUrl.searchParams.get("artist") ?? "";
  if (!title || !artist) return NextResponse.json(null);
  try {
    const results = await searchAlbums(`${artist} ${title}`);
    const wantT = norm(title), wantA = norm(artist).slice(0, 6);
    const hit =
      results.find((a) => norm(a.name).includes(wantT) && a.artists.some((x) => norm(x.name).includes(wantA))) ??
      results[0];
    if (!hit) return NextResponse.json(null);
    return NextResponse.json({
      url: `https://open.spotify.com/album/${hit.id}`,
      image: hit.images?.[0]?.url ?? null,
      name: hit.name,
      artist: hit.artists?.[0]?.name ?? artist,
    });
  } catch {
    return NextResponse.json(null);
  }
}
