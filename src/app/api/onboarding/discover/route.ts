import { NextResponse } from "next/server";
import { GENRE_QUERIES, fetchOne } from "@/app/api/spotify/genre/route";

// Returns 4 albums, each from a DIFFERENT genre, for the onboarding "Discover
// your next favorite" slide — an assorted grid that shows the breadth of the
// catalog. Each first launch draws a fresh, varied set.
export const dynamic = "force-dynamic";

// A spread of distinct genres to sample from. We shuffle and take 4 so the mix
// varies (e.g. Hip-Hop + Jazz + Metal + Pop one launch, Rock + Soul + ... next).
const DISCOVER_GENRES = [
  "Hip-Hop", "Rock", "Jazz", "Electronic", "Pop",
  "R&B", "Metal", "Country", "Indie", "Soul", "Punk", "Alternative",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Resolve one album from a genre, trying a couple of its queries in case the
// first doesn't come back with artwork.
async function albumFromGenre(genre: string) {
  const queries = shuffle(GENRE_QUERIES[genre] ?? []);
  for (const q of queries.slice(0, 3)) {
    const a = await fetchOne(q).catch(() => null);
    if (a && a.artwork) return { title: a.title, artist: a.artist, artwork: a.artwork, genre };
  }
  return null;
}

export async function GET() {
  const picks: { title: string; artist: string; artwork: string; genre: string }[] = [];
  // Walk shuffled genres until we've got 4 distinct-genre albums.
  for (const genre of shuffle(DISCOVER_GENRES)) {
    if (picks.length >= 4) break;
    const album = await albumFromGenre(genre);
    if (album) picks.push(album);
  }
  if (picks.length === 0) return NextResponse.json([], { status: 503 });
  return NextResponse.json(picks, { headers: { "Cache-Control": "no-store" } });
}
