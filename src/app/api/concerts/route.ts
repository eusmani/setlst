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
  source: "SeatGeek" | "Ticketmaster";
}

interface SgPerformer {
  primary?: boolean;
  image?: string | null;
  images?: { huge?: string; large?: string; medium?: string; small?: string; default?: string };
}
interface SgEvent {
  id: number;
  title?: string;
  short_title?: string;
  url?: string;
  datetime_local?: string;
  venue?: { name?: string; city?: string };
  performers?: SgPerformer[];
  performers_images?: Record<string, string>;
  stats?: { lowest_price?: number | null };
}

function performerImage(p?: SgPerformer): string | null {
  if (!p) return null;
  return p.image ?? p.images?.huge ?? p.images?.large ?? p.images?.medium ?? p.images?.small ?? p.images?.default ?? null;
}

// Primary performer's artwork; fall back to ANY performer that has an image.
function pickImage(e: SgEvent): string | null {
  const perfs = e.performers ?? [];
  const primary = perfs.find((x) => x.primary);
  return (
    performerImage(primary) ??
    perfs.map(performerImage).find((u): u is string => !!u) ??
    null
  );
}

// Exported so the onboarding "shows near you" preview can reuse it.
export async function fetchSeatGeek(lat: number, lon: number): Promise<Concert[]> {
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
        image: pickImage(e),
        price: e.stats?.lowest_price != null ? `$${Math.round(e.stats.lowest_price)}` : null,
        source: "SeatGeek",
      };
    });
  } catch {
    return [];
  }
}

// --- Ticketmaster -----------------------------------------------------------
//
// SeatGeek only lists North America — outside it the search returns 200 with an
// empty array, which is indistinguishable from "no shows near you". Ticketmaster
// has worldwide inventory, so it backs SeatGeek up rather than replacing it:
// SeatGeek stays primary where it has stock, because it carries better pricing.

// Ticketmaster's current geo parameter takes a geohash (latlong is deprecated).
const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function geohash(lat: number, lon: number, precision = 7): string {
  let idx = 0, bit = 0, evenBit = true, hash = "";
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  while (hash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; } else { idx = idx * 2; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; } else { idx = idx * 2; latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += GEOHASH_BASE32[idx]; bit = 0; idx = 0; }
  }
  return hash;
}

interface TmImage { url?: string; width?: number; ratio?: string }
interface TmEvent {
  id?: string;
  name?: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { localDate?: string; localTime?: string } };
  priceRanges?: { min?: number; currency?: string }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string } }[] };
}

// Widest 16:9 available — these rows render as landscape banners.
function tmImage(e: TmEvent): string | null {
  const images = e.images ?? [];
  const wide = images.filter((i) => i.ratio === "16_9" && i.url);
  const best = (wide.length ? wide : images.filter((i) => i.url))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url ?? null;
}

export async function fetchTicketmaster(lat: number, lon: number): Promise<Concert[]> {
  const apikey = process.env.TICKETMASTER_API_KEY;
  if (!apikey) return [];

  const params = new URLSearchParams({
    apikey,
    geoPoint: geohash(lat, lon),
    radius: "30",
    unit: "miles",
    classificationName: "music",
    sort: "date,asc",
    startDateTime: new Date().toISOString().slice(0, 19) + "Z",
    size: "8",
  });

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events: TmEvent[] = data?._embedded?.events ?? [];
    return events.map((e): Concert => {
      const venue = e._embedded?.venues?.[0];
      const min = e.priceRanges?.[0]?.min;
      return {
        id: `tm_${e.id ?? ""}`,
        name: e.name ?? "",
        date: e.dates?.start?.localDate ?? "",
        time: e.dates?.start?.localTime?.slice(0, 5),
        venue: venue?.name ?? "",
        city: venue?.city?.name ?? "",
        url: e.url ?? "https://www.ticketmaster.com",
        image: tmImage(e),
        price: min != null ? `$${Math.round(min)}` : null,
        source: "Ticketmaster",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Concerts near a point, from whichever catalogue actually has them.
 *
 * SeatGeek first (better pricing where it has stock), Ticketmaster when SeatGeek
 * comes back empty — which is what happens for every location outside North
 * America, and is why this section looked broken rather than merely empty.
 */
export async function fetchConcertsNear(lat: number, lon: number): Promise<Concert[]> {
  const seatgeek = await fetchSeatGeek(lat, lon);
  if (seatgeek.length > 0) return seatgeek;
  return fetchTicketmaster(lat, lon);
}

export function concertsConfigured(): boolean {
  return !!(process.env.SEATGEEK_CLIENT_ID || process.env.TICKETMASTER_API_KEY);
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!concertsConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!lat || !lon) {
    return NextResponse.json({ error: "missing_location" }, { status: 400 });
  }

  const events = (await fetchConcertsNear(parseFloat(lat), parseFloat(lon)))
    .filter((c) => c.name && c.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return NextResponse.json(events);
}
