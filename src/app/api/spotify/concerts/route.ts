import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTopArtists } from "@/lib/spotifyUser";

// GET /api/spotify/concerts?lat=&lon= → upcoming concerts near the user for the
// artists they actually listen to (top artists from Spotify + SeatGeek events).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ connected: false, concerts: [] }, { status: 401 });

  const id = process.env.SEATGEEK_CLIENT_ID;
  if (!id) return NextResponse.json({ connected: false, concerts: [], error: "not_configured" });

  const artists = await getTopArtists(session.user.id, 15);
  if (artists.length === 0) return NextResponse.json({ connected: false, concerts: [] });

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  const geo = lat && lon ? `&lat=${lat}&lon=${lon}&range=150mi` : "";

  interface SGEvent { id: number; title: string; datetime_local: string; url: string;
    venue?: { name?: string; city?: string }; performers?: { name?: string; image?: string }[]; }

  // Query SeatGeek per top artist (cap to keep it fast), collect upcoming shows.
  const lists = await Promise.all(
    artists.slice(0, 10).map(async (a) => {
      try {
        const url = `https://api.seatgeek.com/2/events?client_id=${id}&type=concert&per_page=2` +
          `&q=${encodeURIComponent(a.name)}${geo}&sort=datetime_local.asc`;
        const r = await fetch(url, { next: { revalidate: 3600 } });
        if (!r.ok) return [];
        const d = await r.json();
        return ((d.events ?? []) as SGEvent[])
          // Only keep events whose performer actually matches this top artist.
          .filter((e) => (e.performers ?? []).some((p) => (p.name ?? "").toLowerCase() === a.name.toLowerCase()))
          .map((e) => ({
            id: String(e.id),
            name: e.title,
            date: (e.datetime_local ?? "").slice(0, 10),
            venue: e.venue?.name ?? "",
            city: e.venue?.city ?? "",
            url: e.url,
            image: e.performers?.[0]?.image ?? null,
            artist: a.name,
          }));
      } catch {
        return [];
      }
    })
  );

  const seen = new Set<string>();
  const concerts = lists.flat()
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .sort((x, y) => x.date.localeCompare(y.date))
    .slice(0, 20);

  return NextResponse.json({ connected: true, concerts });
}
