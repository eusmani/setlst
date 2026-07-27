"use client";
import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
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

// Horizontal album row: cover on the left, name / artist / year on the right.
export default function AlbumRow({ spotifyId, title, artist, artwork, year, avgRating, reviewCount }: Props) {
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

  useEffect(() => {
    if (!override && !artwork && artist && title) heal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = new URLSearchParams({ title, artist });
  if (src) params.set("artwork", src);
  if (year) params.set("year", String(year));
  const href = `/album/${spotifyId}?${params.toString()}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] p-2.5 transition-colors"
    >
      {/* Cover — left */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
        {src ? (
          // Shares its identity with the album page hero, so the cover expands
          // into place instead of the two images swapping.
          <ViewTransition name={`album-cover-${spotifyId}`} share="album-cover">
            <img
              src={src}
              alt={title}
              onError={heal}
              className="h-full w-full object-cover"
            />
          </ViewTransition>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#222222]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="9" />
            </svg>
          </div>
        )}
      </div>

      {/* Name / artist / year — right */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#f0f0f0] leading-snug group-hover:text-[#c4a832] transition-colors">{title}</p>
        <p className="truncate text-xs text-[#a0a0a0] mt-0.5">{artist}</p>
        {year != null && <p className="text-xs text-[#6b6b6b] mt-0.5">{year}</p>}
        {avgRating != null && (
          <p className="mt-1 text-xs font-semibold" style={{ color: ratingTier(avgRating).color }}>
            {ratingTier(avgRating).letter} <span className="font-medium">{ratingTier(avgRating).word}</span>
            {reviewCount != null && <span className="ml-1 font-normal text-[#6b6b6b]">({reviewCount})</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
