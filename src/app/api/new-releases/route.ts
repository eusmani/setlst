import { NextResponse } from "next/server";
import { recentPopularAlbums } from "@/lib/spotify";

export const dynamic = "force-dynamic";

interface Out { id: string; title: string; artist: string; artwork: string | null; releaseDate: string; spotifyUrl: string }

// Reliable fallback: the iTunes "Top Albums" chart (newest first) for when
// Spotify search is momentarily empty/rate-limited.
async function itunesNewest(): Promise<Out[]> {
  try {
    const r = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=25/json", { next: { revalidate: 1800 } });
    if (!r.ok) return [];
    interface E { "im:name"?: { label?: string }; "im:artist"?: { label?: string }; "im:image"?: { label?: string }[]; "im:releaseDate"?: { attributes?: { label?: string } }; id?: { attributes?: { "im:id"?: string }; label?: string } }
    const entries: E[] = (await r.json()).feed?.entry ?? [];
    return entries
      .map((e) => ({
        id: e.id?.attributes?.["im:id"] ?? "",
        title: e["im:name"]?.label ?? "",
        artist: e["im:artist"]?.label ?? "",
        artwork: (e["im:image"]?.slice(-1)[0]?.label ?? "").replace("170x170bb", "600x600bb") || null,
        releaseDate: e["im:releaseDate"]?.attributes?.label ? new Date(e["im:releaseDate"]!.attributes!.label!).toISOString().slice(0, 10) : "",
        spotifyUrl: e.id?.label ?? "https://open.spotify.com/genre/new-releases",
      }))
      .filter((a) => a.id && a.title && a.artist && a.artwork)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  } catch {
    return [];
  }
}

// This week's newest releases from Spotify (search tag:new → ~last 2 weeks),
// newest first. Falls back to the iTunes chart so it's never empty.
export async function GET() {
  try {
    const albums = await recentPopularAlbums(24);
    const out: Out[] = albums.map((a) => ({
      id: a.spotifyId, title: a.title, artist: a.artist, artwork: a.artwork,
      releaseDate: a.releaseDate ?? "", spotifyUrl: a.spotifyUrl,
    }));
    return NextResponse.json(out.length > 0 ? out : await itunesNewest());
  } catch {
    return NextResponse.json(await itunesNewest());
  }
}
