import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/spotify";
import { getTracklist } from "@/lib/tracklist";

export const dynamic = "force-dynamic";

// Track names for an album, for the review composer's favorite / least-favorite
// song pickers. The album page only has a synchronous tracklist when Spotify
// returned one up front — for albums reached by link (metadata from the URL) it
// doesn't, so the composer fetches names here instead. Tries Spotify by id, then
// falls back to the iTunes tracklist by title + artist.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const title = sp.get("title");
  const artist = sp.get("artist");

  try {
    let names: string[] = [];
    if (id) {
      const album = await getAlbum(id).catch(() => null);
      names = (album?.tracks?.items ?? []).map((t) => t.name).filter(Boolean);
    }
    if (names.length === 0 && title && artist) {
      const tl = await getTracklist(title, artist).catch(() => []);
      names = tl.map((t) => t.name).filter(Boolean);
    }
    // De-dupe while preserving order.
    return NextResponse.json({ tracks: [...new Set(names)] });
  } catch {
    return NextResponse.json({ tracks: [] });
  }
}
