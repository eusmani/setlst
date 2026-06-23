import { NextRequest, NextResponse } from "next/server";

interface Concert {
  id: string;
  name: string;
  date: string;
  time?: string;
  venue: string;
  city: string;
  url: string;
  image: string | null;
  price: string | null;
  source: "SeatGeek";
}

interface SgPerformer {
  primary?: boolean;
  image?: string | null;
  images?: { huge?: string; large?: string };
}
interface SgEvent {
  id: number;
  title?: string;
  short_title?: string;
  url?: string;
  datetime_local?: string;
  venue?: { name?: string; city?: string };
  performers?: SgPerformer[];
  stats?: { lowest_price?: number | null };
}

// Use the primary performer's artwork; fall back to the first performer.
function pickImage(performers?: SgPerformer[]): string | null {
  if (!performers?.length) return null;
  const p = performers.find((x) => x.primary) ?? performers[0];
  return p.image ?? p.images?.huge ?? p.images?.large ?? null;
}

async function fetchSeatGeek(lat: number, lon: number): Promise<Concert[]> {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  if (!clientId) return [];
  const params = new URLSearchParams({
    client_id: clientId,
    lat: String(lat),
    lon: String(lon),
    range: "30mi",
    type: "concert",
    sort: "datetime_utc.asc",
    "datetime_utc.gte": new Date().toISOString().slice(0, 19),
    per_page: "8",
  });
  // client_secret is optional for read endpoints but raises rate limits when set.
  if (process.env.SEATGEEK_CLIENT_SECRET) params.set("client_secret", process.env.SEATGEEK_CLIENT_SECRET);

  try {
    const res = await fetch(`https://api.seatgeek.com/2/events?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events: SgEvent[] = data?.events ?? [];
    return events.map((e): Concert => {
      const local = e.datetime_local ?? "";
      return {
        id: `sg_${e.id}`,
        name: e.title ?? e.short_title ?? "",
        date: local.slice(0, 10),
        time: local.length >= 16 ? local.slice(11, 16) : undefined,
        venue: e.venue?.name ?? "",
        city: e.venue?.city ?? "",
        url: e.url ?? "https://seatgeek.com",
        image: pickImage(e.performers),
        price: e.stats?.lowest_price != null ? `$${Math.round(e.stats.lowest_price)}` : null,
        source: "SeatGeek",
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!process.env.SEATGEEK_CLIENT_ID) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!lat || !lon) {
    return NextResponse.json({ error: "missing_location" }, { status: 400 });
  }

  const events = (await fetchSeatGeek(parseFloat(lat), parseFloat(lon)))
    .filter((c) => c.name && c.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return NextResponse.json(events);
}
