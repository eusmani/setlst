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
        <div className="divide-y divide-[#1f1f1f]">
          {concerts.map((c) => (
            <a
              key={c.id}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 px-4 py-2.5 hover:bg-[#222222] transition-colors group"
            >
              {c.image ? (
                <img
                  src={c.image}
                  alt={c.name}
                  width={48}
                  height={48}
                  className="rounded w-12 h-12 object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-[#222222] shrink-0 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f0] truncate leading-snug group-hover:text-[#c4a832] transition-colors">
                  {c.name}
                </p>
                <p className="text-xs text-[#a0a0a0] truncate">{c.venue}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-[#c4a832]">{formatDate(c.date)}</p>
                  {c.price && (
                    <>
                      <span className="text-[#2e2e2e] text-[11px]">·</span>
                      <p className="text-[11px] text-[#6b6b6b]">{c.price}</p>
                    </>
                  )}
                  {c.source && (
                    <span className="ml-auto text-[9px] uppercase tracking-wide text-[#6b6b6b] border border-[#2e2e2e] rounded px-1 py-px shrink-0">
                      SeatGeek
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
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
