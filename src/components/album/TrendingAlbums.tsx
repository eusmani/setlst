"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AlbumCard from "@/components/album/AlbumCard";
import { SAMPLE_ALBUMS } from "@/lib/sampleData";

interface TrendingRow {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

export default function TrendingAlbums({
  limit = 6,
  heading = "Trending Now",
  showSeeAll = true,
  seeAllHref = "/charts",
  albums,
  fallback = null,
  fallbackToPopular = false,
  slider = false,
  emptyMessage,
}: {
  limit?: number;
  heading?: string;
  showSeeAll?: boolean;
  seeAllHref?: string; // where the "See more" link points
  albums?: TrendingRow[]; // when provided, render these instead of fetching /api/trending
  fallback?: React.ReactNode;
  fallbackToPopular?: boolean; // when there's no activity yet, show a popular sample under the same heading
  slider?: boolean; // horizontal sliding bar (3 visible at a time)
  emptyMessage?: string; // keep the section (with heading) and show this prompt when there's no activity
}) {
  const [rows, setRows] = useState<TrendingRow[] | null>(albums ?? null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function page(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (albums) return; // caller supplied the albums directly
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [albums]);

  const display: TrendingRow[] =
    rows && rows.length === 0 && fallbackToPopular
      ? SAMPLE_ALBUMS.slice(0, limit).map((a) => ({
          spotifyId: a.spotifyId, title: a.title, artist: a.artist,
          artwork: a.artwork ?? null, year: a.year ?? null,
        }))
      : rows ?? [];

  if (rows === null) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
        ))}
      </div>
    );
  }

  if (display.length === 0) {
    // Keep the section visible with its heading and a prompt to seed popularity.
    if (emptyMessage) {
      return (
        <div>
          <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-4">{heading}</p>
          <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-5 py-8 text-center">
            <p className="text-sm text-[#a0a0a0] mb-2">{emptyMessage}</p>
            <Link href="/search" className="text-xs text-[#c4a832] hover:underline">
              Find an album to log →
            </Link>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  const items = display.slice(0, limit);

  const canPage = slider && items.length > 3;

  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a]/90 border border-[#2e2e2e] text-[#f0f0f0] hover:border-[#c4a832] hover:text-[#c4a832] shadow-lg transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em]">{heading}</p>
        {showSeeAll && (
          <Link href={seeAllHref} className="text-xs text-[#a0a0a0] hover:text-[#c4a832] transition-colors">
            See more →
          </Link>
        )}
      </div>

      {slider ? (
        <div className="relative">
          {/* Left arrow — only appears once you've advanced */}
          {canPage && !atStart && (
            <button onClick={() => page(-1)} aria-label="Previous" className={`${arrowBtn} left-0 -ml-1`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          <div
            ref={scrollerRef}
            onScroll={updateArrows}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((a, i) => (
              <div
                key={a.spotifyId}
                className="snap-start shrink-0 w-[30%] sm:w-[23%] lg:w-[18%] album-slide-in"
                style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
              >
                <AlbumCard spotifyId={a.spotifyId} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year ?? undefined} />
              </div>
            ))}
          </div>
          {/* Right arrow — hidden once you reach the end */}
          {canPage && !atEnd && (
            <button onClick={() => page(1)} aria-label="Next" className={`${arrowBtn} right-0 -mr-1`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((a, i) => (
            <div key={a.spotifyId} className="album-slide-in" style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}>
              <AlbumCard spotifyId={a.spotifyId} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year ?? undefined} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
