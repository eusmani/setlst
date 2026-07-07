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

// Start of the current week (Monday, YYYY-MM-DD) — rolls forward automatically.
function weekStart(): string {
  const now = new Date();
  const m = new Date(now);
  m.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m.toISOString().slice(0, 10);
}

// This week's releases — everything out on/after Monday, newest first. Merges
// Spotify (tag:new) and the iTunes chart so the radar is full of fresh drops.
export async function GET() {
  const monday = weekStart();
  let merged: Out[] = [];
  try {
    const spotify = (await recentPopularAlbums(40, "date")).map((a) => ({
      id: a.spotifyId, title: a.title, artist: a.artist, artwork: a.artwork,
      releaseDate: a.releaseDate ?? "", spotifyUrl: a.spotifyUrl,
    }));
    merged = [...spotify, ...(await itunesNewest())];
  } catch {
    merged = await itunesNewest();
  }

  const seen = new Set<string>();
  const thisWeek = merged
    .filter((a) => a.releaseDate >= monday)                       // out this week
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));   // newest first

  return NextResponse.json(thisWeek);
}
