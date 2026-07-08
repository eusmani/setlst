"use client";
import { useEffect, useState } from "react";
import AlbumCard from "@/components/album/AlbumCard";

interface Release { id: string; title: string; artist: string; artwork: string | null; releaseDate: string }

type Filter = "recent" | "week" | "upcoming";
const PILLS: { key: Filter; label: string; endpoint: string }[] = [
  { key: "recent", label: "Recent", endpoint: "/api/releases?range=recent" },
  { key: "week", label: "This week", endpoint: "/api/new-releases" },
  { key: "upcoming", label: "Upcoming", endpoint: "/api/releases" },
];

// Home strip: filter albums by Recent / This week / Upcoming via bubble pills.
export default function ReleaseFilterPills() {
  const [filter, setFilter] = useState<Filter>("week");
  const [cache, setCache] = useState<Record<Filter, Release[] | undefined>>({ recent: undefined, week: undefined, upcoming: undefined });

  const active = PILLS.find((p) => p.key === filter)!;
  const albums = cache[filter];

  useEffect(() => {
    if (cache[filter] !== undefined) return; // already loaded
    fetch(active.endpoint)
      .then((r) => r.json())
      .then((d) => setCache((c) => ({ ...c, [filter]: Array.isArray(d) ? d : [] })))
      .catch(() => setCache((c) => ({ ...c, [filter]: [] })));
  }, [filter, active.endpoint, cache]);

  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2 mb-3">
        {PILLS.map((p) => (
          <button
            key={p.key}
            onClick={() => setFilter(p.key)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${
              filter === p.key
                ? "bg-[#c4a832] border-[#c4a832] text-[#141414] font-medium"
                : "border-[#2e2e2e] text-[#a0a0a0] hover:text-[#f0f0f0] hover:border-[#c4a832]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {albums === undefined ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[30%] aspect-square rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <p className="text-xs text-[#6b6b6b] py-4">Nothing here right now — check back soon.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {albums.slice(0, 15).map((a) => (
            <div key={a.id} className="snap-start shrink-0 w-[30%] sm:w-[23%]">
              <AlbumCard spotifyId={a.id} title={a.title} artist={a.artist} artwork={a.artwork}
                year={a.releaseDate ? parseInt(a.releaseDate.slice(0, 4)) : undefined} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
