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
    const override = coverOverride(cur.title, cur.artist);
    setArtwork(override ?? null);
    setDescription(null);
    // Artwork: use override if present, else resolve from iTunes.
    if (!override) {
      const q = encodeURIComponent(`${cur.artist} ${cur.title}`);
      fetch(`/api/spotify/search?q=${q}`)
        .then((r) => r.json())
        .then((d: { results?: { name: string; images?: { url: string }[] }[] }) => {
          const results = d.results ?? [];
          const want = cur.title.toLowerCase();
          const hit = results.find((a) => a.name?.toLowerCase().includes(want)) ?? results[0];
          setArtwork(hit?.images?.[0]?.url ?? null);
        })
        .catch(() => {});
    }
    fetch(`/api/album-description?title=${encodeURIComponent(cur.title)}&artist=${encodeURIComponent(cur.artist)}`)
      .then((r) => r.json())
      .then((d: { description?: string | null }) => setDescription(d.description ?? null))
      .catch(() => {});
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
        <p className="text-sm text-[#bbbbbb] leading-relaxed mt-4 pt-4 border-t border-[#1f1f1f] line-clamp-4">
          {description}
        </p>
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
