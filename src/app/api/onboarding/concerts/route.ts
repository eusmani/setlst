import { NextRequest, NextResponse } from "next/server";
import { fetchConcertsNear, concertsConfigured } from "@/app/api/concerts/route";

// A short list of upcoming concerts for the onboarding "Catch shows near you"
// slide. Onboarding runs before we ask for location permission, so we geolocate
// approximately from the request IP (Vercel geo headers) — no prompt needed —
// and fall back to a major music city so the slide always has something to show.
export const dynamic = "force-dynamic";

// Fallback cities (used when IP geo is unavailable or returns no shows). Rotated
// so the preview isn't always the same city.
const FALLBACK_CITIES: [number, number][] = [
  [40.7128, -74.006], // New York
  [34.0522, -118.2437], // Los Angeles
  [41.8781, -87.6298], // Chicago
];

export async function GET(req: NextRequest) {
  if (!concertsConfigured()) {
    return NextResponse.json([], { status: 200 });
  }

  // Approximate location from Vercel's IP geolocation headers.
  const hLat = req.headers.get("x-vercel-ip-latitude");
  const hLon = req.headers.get("x-vercel-ip-longitude");

  let concerts: Awaited<ReturnType<typeof fetchConcertsNear>> = [];
  if (hLat && hLon) {
    concerts = await fetchConcertsNear(parseFloat(hLat), parseFloat(hLon)).catch(() => []);
  }

  // Nothing nearby (or no geo headers)? Show a major-city lineup instead.
  if (concerts.length === 0) {
    const [lat, lon] = FALLBACK_CITIES[Math.floor(Math.random() * FALLBACK_CITIES.length)];
    concerts = await fetchConcertsNear(lat, lon).catch(() => []);
  }

  const out = concerts
    .filter((c) => c.name && c.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
