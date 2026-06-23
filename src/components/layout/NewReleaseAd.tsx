"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Release {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  releaseDate: string;
  spotifyUrl: string;
}

export default function NewReleaseAd() {
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    fetch("/api/releases?range=recent")
      .then((r) => r.json())
      .then((d) => {
        // range=recent returns albums already out (on/before today), most recent
        // first — take the most recent release.
        if (Array.isArray(d) && d.length > 0) setRelease(d[0]);
      })
      .catch(() => {});
  }, []);

  if (!release) return null;
  const r = release;
  const date = new Date(r.releaseDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#1a1a1a]">
      {r.artwork && (
        <div className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl scale-125" style={{ backgroundImage: `url(${r.artwork})` }} />
      )}
      <div className="relative z-10 flex items-center gap-3 p-3">
        {r.artwork && (
          <Link href={`/album/${r.id}?title=${encodeURIComponent(r.title)}&artist=${encodeURIComponent(r.artist)}&artwork=${encodeURIComponent(r.artwork)}`} className="shrink-0">
            <img src={r.artwork} alt={r.title} className="w-14 h-14 rounded-lg object-cover shadow-md" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-[#c4a832] uppercase tracking-[0.18em] mb-0.5">New Release</p>
          <a
            href={r.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-[#f0f0f0] hover:text-[#1DB954] transition-colors leading-tight block truncate"
          >
            {r.title}
          </a>
          <p className="text-xs text-[#a0a0a0] truncate">{r.artist}</p>
          <p className="text-[10px] text-[#6b6b6b] mt-0.5">{date}</p>
        </div>
      </div>
    </div>
  );
}
