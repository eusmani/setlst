"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { coverOverride } from "@/lib/coverOverrides";
import { ratingTier } from "@/lib/rating";

interface Props {
  spotifyId: string;
  title: string;
  artist: string;
  artwork?: string | null;
  year?: number | null;
  avgRating?: number | null;
  reviewCount?: number;
}

export default function AlbumCard({ spotifyId, title, artist, artwork, year, avgRating, reviewCount }: Props) {
  const override = coverOverride(title, artist);
  const [src, setSrc] = useState<string | null>(override ?? artwork ?? null);
  const [healed, setHealed] = useState(false);

  // Resolve a working cover from iTunes when one is missing or fails to load.
  async function heal() {
    if (override) { setSrc(override); return; }
    if (healed) { setSrc(null); return; }
    setHealed(true);
    try {
      const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(`${artist} ${title}`)}`);
      const d = await r.json();
      const want = title.toLowerCase();
      const hit = (d.results ?? []).find((a: { name?: string }) => a.name?.toLowerCase().includes(want)) ?? d.results?.[0];
      setSrc(hit?.images?.[0]?.url ?? null);
    } catch {
      setSrc(null);
    }
  }

  // If there's no cover to begin with, try to resolve one.
  useEffect(() => {
    if (!override && !artwork && artist && title) heal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = new URLSearchParams({ title, artist });
  if (src) params.set("artwork", src);
  if (year) params.set("year", String(year));
  const href = `/album/${spotifyId}?${params.toString()}`;

  return (
    <Link href={href} className="group block">
      <div className="rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#1f1f1f] group-hover:border-[#2e2e2e] transition-all duration-200">
        <div className="aspect-square overflow-hidden">
          {src ? (
            <img
              src={src}
              alt={title}
              onError={heal}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-[#222222] flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="9" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm text-[#f0f0f0] truncate leading-snug">{title}</p>
          <p className="text-xs text-[#a0a0a0] truncate mt-0.5">
            {artist}{year && <span className="ml-1">· {year}</span>}
          </p>
          {avgRating != null && (
            <p className="mt-1.5 text-xs font-semibold" style={{ color: ratingTier(avgRating).color }}>
              {ratingTier(avgRating).letter} <span className="font-medium">{ratingTier(avgRating).word}</span>
              {reviewCount != null && <span className="text-[#6b6b6b] font-normal ml-1">({reviewCount})</span>}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
