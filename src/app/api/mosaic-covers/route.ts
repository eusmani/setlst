import { NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";

export const dynamic = "force-dynamic";

interface Entry {
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: { label?: string }[];
}

// Apple Music Top Albums — overall + a spread of genres — for a large, varied
// pool of distinct covers (genre IDs: pop, hip-hop, rock, R&B, alt, electronic,
// country, jazz). Used to fill the home-screen mural with non-curated albums.
const FEEDS = [
  "https://itunes.apple.com/us/rss/topalbums/limit=100/json",
  ...[14, 18, 21, 15, 20, 7, 6, 11].map(
    (g) => `https://itunes.apple.com/us/rss/topalbums/limit=50/genre=${g}/json`
  ),
];

async function feedCovers(url: string): Promise<{ art: string; name: string; artist: string }[]> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const entries: Entry[] = (await r.json()).feed?.entry ?? [];
    return entries.map((e) => ({
      art: (e["im:image"]?.slice(-1)[0]?.label ?? "").replace("170x170bb", "600x600bb"),
      name: e["im:name"]?.label ?? "",
      artist: e["im:artist"]?.label ?? "",
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const all = (await Promise.all(FEEDS.map(feedCovers))).flat();
    const seen = new Set<string>();
    const covers = all
      .filter((x) => x.art && !isLikelyAI(x.artist, x.name))
      .map((x) => x.art)
      .filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
    return NextResponse.json(covers);
  } catch {
    return NextResponse.json([]);
  }
}
