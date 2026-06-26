import { NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";

export const dynamic = "force-dynamic";

const BAD = /\b(karaoke|tribute|made famous|cover version|8-bit|parody)\b/i;

interface Entry {
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: { label?: string }[];
  "im:releaseDate"?: { attributes?: { label?: string } };
  id?: { attributes?: { "im:id"?: string } };
}

// Newest, hottest albums — Apple Music / iTunes "Top Albums" chart.
// (Spotify's /browse/new-releases is 403 for client-credential apps as of late 2024.)
export async function GET() {
  try {
    const r = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=40/json", {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return NextResponse.json([]);
    const d = await r.json();
    const entries: Entry[] = d.feed?.entry ?? [];
    const seen = new Set<string>();
    const out = entries
      .map((e) => {
        const date = e["im:releaseDate"]?.attributes?.label;
        return {
          spotifyId: e.id?.attributes?.["im:id"] ?? "",
          title: e["im:name"]?.label ?? "",
          artist: e["im:artist"]?.label ?? "",
          artwork: (e["im:image"]?.slice(-1)[0]?.label ?? "").replace("170x170bb", "600x600bb"),
          year: date ? new Date(date).getFullYear() : null,
        };
      })
      .filter((a) => a.spotifyId && a.title && a.artist && a.artwork)
      .filter((a) => !BAD.test(a.title) && !isLikelyAI(a.artist, a.title))
      .filter((a) => (seen.has(a.spotifyId) ? false : (seen.add(a.spotifyId), true)));
    return NextResponse.json(out);
  } catch {
    return NextResponse.json([]);
  }
}
