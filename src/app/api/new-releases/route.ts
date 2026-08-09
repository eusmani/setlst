import { NextResponse } from "next/server";
import { recentPopularAlbums } from "@/lib/spotify";
import { isLikelyAI } from "@/lib/aiFilter";

export const dynamic = "force-dynamic";

interface Out { id: string; title: string; artist: string; artwork: string | null; releaseDate: string; spotifyUrl: string }

/** A Spotify search link for a release we only know by name. */
function spotifySearchUrl(artist?: string, title?: string): string {
  const query = [artist, title].filter(Boolean).join(" ").trim();
  return query
    ? `https://open.spotify.com/search/${encodeURIComponent(query)}`
    : "https://open.spotify.com/genre/new-releases";
}

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
        // The field is a Spotify link, and this feed is Apple's — `e.id.label`
        // is a music.apple.com page, so "Listen" opened Apple Music. iTunes
        // can't tell us a Spotify id, so link to Spotify's search for the
        // release instead: it opens the Spotify app on the right album.
        spotifyUrl: spotifySearchUrl(e["im:artist"]?.label, e["im:name"]?.label),
      }))
      .filter((a) => a.id && a.title && a.artist && a.artwork)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  } catch {
    return [];
  }
}

// The most recent New-Music Friday (YYYY-MM-DD) — today if it's Friday, else the
// previous Friday. Rolls forward every Friday automatically.
function lastFriday(): string {
  const now = new Date();
  const diff = (now.getDay() - 5 + 7) % 7; // days since Friday (0 if today is Fri)
  const f = new Date(now);
  f.setDate(now.getDate() - diff);
  f.setHours(0, 0, 0, 0);
  return f.toISOString().slice(0, 10);
}

// This week's releases — everything out since the most recent Friday, newest
// first. Merges Spotify (tag:new) and the iTunes chart so the radar stays full.
export async function GET() {
  const monday = lastFriday();
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
    .filter((a) => !isLikelyAI(a.artist, a.title))               // keep AI-generated acts off the radar
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));   // newest first

  return NextResponse.json(thisWeek, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
