"use client";
import { useState, useEffect } from "react";

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
  source?: "SeatGeek";
}

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

type Status = "idle" | "locating" | "loading" | "done" | "error" | "unconfigured";

export default function LocalConcerts() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [locationLabel, setLocationLabel] = useState("");
  const [attended, setAttended] = useState<Set<string>>(new Set());

  // Load which concerts the user has already added to their archive.
  useEffect(() => {
    fetch("/api/concerts/attend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: { externalId: string }[]) => { if (Array.isArray(d)) setAttended(new Set(d.map((x) => x.externalId))); })
      .catch(() => {});
  }, []);

  async function toggleAttend(c: Concert) {
    // Optimistic toggle.
    setAttended((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; });
    try {
      await fetch("/api/concerts/attend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: c.id, name: c.name, venue: c.venue, city: c.city, date: c.date, image: c.image }),
      });
    } catch { /* revert on failure */
      setAttended((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; });
    }
  }

  async function fetchConcerts(lat: number, lon: number, city: string) {
    setStatus("loading");
    setLocationLabel(city);
    const res = await fetch(`/api/concerts?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data.error === "not_configured") { setStatus("unconfigured"); return; }
    if (!res.ok || data.error) { setStatus("error"); return; }
    setConcerts(data);
    setStatus("done");
  }

  async function requestLocation() {
    setStatus("locating");
    // Native-aware location (WKWebView can't use the web geolocation API directly).
    const { getCoords } = await import("@/lib/native");
    const coords = await getCoords();
    if (!coords) { setStatus("error"); return; }
    const { lat: latitude, lon: longitude } = coords;
    // Reverse geocode city name
    let city = "your area";
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const geoData = await geo.json();
      city = geoData.address?.city || geoData.address?.town || geoData.address?.state || "your area";
    } catch {}
    fetchConcerts(latitude, longitude, city);
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p className="text-sm text-[#f0f0f0] uppercase tracking-widest flex-1">Local Concerts</p>
        {locationLabel && (
          <span className="text-[10px] text-[#6b6b6b] truncate max-w-[80px]">{locationLabel}</span>
        )}
      </div>

      {/* Body */}
      {status === "idle" && (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-[#a0a0a0] mb-3">Find concerts near you</p>
          <button
            onClick={requestLocation}
            className="text-xs bg-[#222222] hover:bg-[#2e2e2e] border border-[#2e2e2e] text-[#f0f0f0] px-4 py-2 rounded transition-colors"
          >
            Use my location
          </button>
        </div>
      )}

      {status === "locating" && (
        <div className="px-4 py-5 text-center text-xs text-[#6b6b6b]">Getting location…</div>
      )}

      {status === "loading" && (
        <div className="px-4 py-5 text-center text-xs text-[#6b6b6b]">Finding concerts…</div>
      )}

      {status === "unconfigured" && (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-[#6b6b6b]">Add a SeatGeek API key to enable concert search.</p>
        </div>
      )}

      {status === "error" && (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-[#6b6b6b] mb-2">Couldn&apos;t get location</p>
          <button
            onClick={requestLocation}
            className="text-xs text-[#c4a832] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {status === "done" && concerts.length === 0 && (
        <div className="px-4 py-5 text-center text-xs text-[#6b6b6b]">
          No upcoming concerts found nearby.
        </div>
      )}

      {status === "done" && concerts.length > 0 && (
        <div className="p-3 space-y-3">
          {concerts.map((c) => {
            const going = attended.has(c.id);
            return (
              <div key={c.id} className="rounded-xl overflow-hidden border border-[#1f1f1f] bg-[#141414] group">
                {/* Show banner — the actual event's landscape artwork */}
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="block relative">
                  {c.image ? (
                    <img src={c.image} alt={c.name} referrerPolicy="no-referrer" loading="lazy" className="w-full h-28 object-cover bg-[#222222]" />
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    </div>
                  )}
                  {/* Gradient + show name overlaid on the banner */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <p className="absolute bottom-2 left-3 right-3 text-sm text-white font-semibold truncate drop-shadow group-hover:text-[#c4a832] transition-colors">{c.name}</p>
                </a>

                <div className="px-3 py-2.5">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="block">
                    <p className="text-xs text-[#a0a0a0] truncate">{c.venue}{c.city ? ` · ${c.city}` : ""}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px] text-[#c4a832]">{formatDate(c.date)}</p>
                      {c.price && (<><span className="text-[#2e2e2e] text-[11px]">·</span><p className="text-[11px] text-[#6b6b6b]">{c.price}</p></>)}
                    </div>
                  </a>
                  {/* Add this show to your music archive */}
                  <button
                    onClick={() => toggleAttend(c)}
                    className={`mt-2 inline-flex items-center gap-1 text-[10px] rounded-full px-2.5 py-1 border transition-colors ${
                      going ? "border-[#c4a832] bg-[#2a2412] text-[#c4a832]" : "border-[#2e2e2e] text-[#6b6b6b] hover:text-[#c4a832] hover:border-[#c4a832]"
                    }`}
                  >
                    {going ? (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>In your concerts</>
                    ) : (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>I&apos;m going</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status === "done" && (
        <div className="px-4 py-2.5 border-t border-[#1f1f1f] flex items-center justify-between">
          <button
            onClick={requestLocation}
            className="text-[10px] text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
          >
            Refresh
          </button>
          <a
            href="https://seatgeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
          >
            More on SeatGeek →
          </a>
        </div>
      )}
    </div>
  );
}
