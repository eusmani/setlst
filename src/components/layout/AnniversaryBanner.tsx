"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTodayAnniversaries } from "@/lib/anniversaries";
import { coverOverride } from "@/lib/coverOverrides";

export default function AnniversaryBanner() {
  const today = getTodayAnniversaries();
  const items = today?.items ?? [];
  const [i, setI] = useState(0);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  const cur = items[i];

  // Rotate through the day's albums (slideshow), like the new-release banner.
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  // Resolve artwork + description for the current album.
  useEffect(() => {
    if (!cur) return;
    // The slideshow rotates while requests are in flight; ignore a stale response
    // so a slow lookup for the previous album can't overwrite the current cover.
    let cancelled = false;
    const override = coverOverride(cur.title, cur.artist);
    setArtwork(override ?? null);
    setDescription(null);
    // Artwork: use override if present, else resolve the canonical cover from the
    // real Spotify catalog (verifies exact artist + title — no same-named albums,
    // remixes, or tributes).
    if (!override) {
      fetch(`/api/spotify/cover?title=${encodeURIComponent(cur.title)}&artist=${encodeURIComponent(cur.artist)}`)
        .then((r) => r.json())
        .then((d: { cover?: string | null }) => { if (!cancelled) setArtwork(d.cover ?? null); })
        .catch(() => {});
    }
    fetch(`/api/album-description?title=${encodeURIComponent(cur.title)}&artist=${encodeURIComponent(cur.artist)}`)
      .then((r) => r.json())
      .then((d: { description?: string | null }) => { if (!cancelled) setDescription(d.description ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cur?.title, cur?.artist]);

  if (!today || !cur) return null;

  const yearsAgo = new Date().getFullYear() - cur.year;
  const [mm, dd] = today.mmdd.split("-");
  const dateStr = new Date(cur.year, parseInt(mm) - 1, parseInt(dd))
    .toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const albumHref =
    `/album/${cur.spotifyId}?title=${encodeURIComponent(cur.title)}` +
    `&artist=${encodeURIComponent(cur.artist)}` +
    (artwork ? `&artwork=${encodeURIComponent(artwork)}` : "");

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-5">
      <p className="on-this-day text-[10px] text-[#c4a832] uppercase tracking-[0.18em] mb-4">
        {today.isExact ? "On this day" : "Recent anniversary"}
      </p>

      <div className="flex flex-col sm:flex-row gap-5">
        <Link href={albumHref} className="shrink-0 self-center sm:self-start">
          {artwork ? (
            <img src={artwork} alt={cur.title} className="w-40 h-40 rounded-lg object-cover shadow-lg" />
          ) : (
            <div className="w-40 h-40 rounded-lg bg-[#222222]" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={albumHref} className="block">
            <h3 className="text-xl text-[#f0f0f0] hover:text-[#c4a832] leading-tight transition-colors">{cur.title}</h3>
          </Link>
          <p className="text-sm text-[#a0a0a0] mt-0.5">{cur.artist}</p>
          <p className="text-xs text-[#6b6b6b] mt-1">
            Released {dateStr}, {cur.year} · {yearsAgo} year{yearsAgo !== 1 ? "s" : ""} ago
          </p>
        </div>
      </div>

      {/* Description at the bottom */}
      {description && (
        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-sm text-[#bbbbbb] leading-relaxed line-clamp-4">{description}</p>
          {description.length > 220 && (
            <button
              onClick={() => setShowFull(true)}
              className="mt-2 text-xs text-[#c4a832] hover:underline"
            >
              See more →
            </button>
          )}
        </div>
      )}

      {/* Full-text modal */}
      {showFull && description && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setShowFull(false)}
        >
          <div
            className="w-full max-w-lg max-h-[78vh] overflow-y-auto overscroll-contain bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="min-w-0">
                <p className="on-this-day text-[10px] text-[#c4a832] uppercase tracking-[0.18em] mb-1">On this day</p>
                <h3 className="text-lg text-[#f0f0f0] leading-tight">{cur.title}</h3>
                <p className="text-sm text-[#a0a0a0]">{cur.artist} · {cur.year}</p>
              </div>
              <button onClick={() => setShowFull(false)} aria-label="Close" className="shrink-0 text-[#6b6b6b] hover:text-[#f0f0f0]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
              </button>
            </div>
            <p className="text-sm text-[#cfcfcf] leading-relaxed whitespace-pre-wrap mt-3">{description}</p>
            <Link href={albumHref} onClick={() => setShowFull(false)} className="inline-block mt-4 text-xs text-[#c4a832] hover:underline">
              View album →
            </Link>
          </div>
        </div>
      )}

      {/* Slideshow dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Show album ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-[#c4a832]" : "w-1.5 bg-[#3a3a3a] hover:bg-[#555]"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
