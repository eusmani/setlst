import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTopArtists, getUserToken } from "@/lib/spotifyUser";

// GET /api/spotify/for-you → albums to review, drawn from the user's top artists'
// catalog (Spotify). Falls back gracefully when not connected.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ connected: false, albums: [] }, { status: 401 });

  const [token, artists] = await Promise.all([
    getUserToken(session.user.id),
    getTopArtists(session.user.id, 12),
  ]);
  if (!token || artists.length === 0) return NextResponse.json({ connected: !!token, albums: [] });

  // Pull a notable album from each of the user's top artists.
  const results = await Promise.all(
    artists.slice(0, 8).map(async (a) => {
      try {
        // One call PER ARTIST, so a single page view costs 8. Spotify rate
        // limits per app, not per token, so this drains the same quota the
        // search endpoints need. A discography barely changes day to day.
        const r = await fetch(`https://api.spotify.com/v1/artists/${a.id}/albums?include_groups=album&limit=3&market=US`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 86400 },
        });
        if (!r.ok) return null;
        const d = await r.json();
        interface Alb { id: string; name: string; images?: { url: string }[]; release_date?: string; artists?: { name: string }[] }
        const alb: Alb | undefined = (d.items ?? [])[0];
        if (!alb) return null;
        return {
          spotifyId: alb.id,
          title: alb.name,
          artist: alb.artists?.[0]?.name ?? a.name,
          artwork: alb.images?.[0]?.url ?? null,
          year: alb.release_date ? parseInt(alb.release_date) : null,
        };
      } catch {
        return null;
      }
    })
  );

  const seen = new Set<string>();
  const albums = results.filter((x): x is NonNullable<typeof x> => !!x && !seen.has(x.spotifyId) && (seen.add(x.spotifyId), true));
  return NextResponse.json({ connected: true, albums });
}
