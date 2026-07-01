"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ClubPick {
  category: string;
  label: string;
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
}

function albumHref(a: ClubPick) {
  return `/album/${a.spotifyId}?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}` +
    (a.artwork ? `&artwork=${encodeURIComponent(a.artwork)}` : "");
}

// Home-screen preview of this week's SETLST Clubs.
export default function ClubsStrip() {
  const [clubs, setClubs] = useState<ClubPick[] | null>(null);

  useEffect(() => {
    fetch("/api/clubs").then((r) => r.json()).then((d) => setClubs(Array.isArray(d) ? d : [])).catch(() => setClubs([]));
  }, []);

  if (clubs !== null && clubs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em]">Grails · This Week</h2>
        <Link href="/clubs" className="text-xs text-[#a0a0a0] hover:text-[#c4a832] transition-colors">See all →</Link>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(clubs ?? Array.from({ length: 4 })).map((c, i) =>
          c ? (
            <Link key={c.category} href={albumHref(c)}
              className="snap-start shrink-0 w-[42%] sm:w-[30%] lg:w-[23%] group">
              <div className="aspect-square rounded-xl overflow-hidden border border-[#1f1f1f] group-hover:border-[#c4a832] transition-colors">
                {c.artwork ? (
                  <img src={c.artwork} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#222222]" />
                )}
              </div>
              <p className="text-[10px] text-[#c4a832] uppercase tracking-wide mt-1.5">{c.label}</p>
              <p className="text-xs text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{c.title}</p>
              <p className="text-[11px] text-[#6b6b6b] truncate">{c.artist}</p>
            </Link>
          ) : (
            <div key={i} className="snap-start shrink-0 w-[42%] sm:w-[30%] lg:w-[23%]">
              <div className="aspect-square rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
            </div>
          )
        )}
      </div>
    </div>
  );
}
