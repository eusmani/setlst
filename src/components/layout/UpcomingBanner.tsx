"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Release {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  releaseDate: string;
  spotifyUrl: string;
}

export default function UpcomingBanner() {
  const pathname = usePathname();
  const [release, setRelease] = useState<Release | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/releases")
      .then((r) => r.json())
      .then((d: Release[]) => {
        if (!Array.isArray(d) || d.length === 0) return;
        // Pick the track whose release date is closest to today — i.e. the most
        // recent one to drop, or the very next one coming out.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dist = (r: Release) =>
          Math.abs(new Date(r.releaseDate + "T00:00:00").getTime() - today.getTime());
        const nearest = d.reduce((best, r) => (dist(r) < dist(best) ? r : best));
        setRelease(nearest);
      })
      .catch(() => {});
  }, []);

  // Hidden in the Albums section (search + album pages).
  const onAlbums = pathname === "/search" || pathname.startsWith("/album");
  if (onAlbums || !release || dismissed) return null;

  const date = new Date(release.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="relative bg-[#1a1a1a] border-b border-[#2e2e2e] overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-5 py-2.5 flex items-center gap-3">
        <span className="text-[10px] text-[#c4a832] uppercase tracking-widest shrink-0 hidden sm:block">
          New Release
        </span>
        {release.artwork && (
          <img src={release.artwork} alt={release.title} width={32} height={32}
            className="rounded w-8 h-8 object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#f0f0f0] truncate">
            <span className="text-[#c4a832]">{release.artist}</span>
            {" — "}
            <a
              href={release.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DB954] hover:underline transition-colors"
            >
              {release.title}
            </a>
          </span>
          <span className="text-[10px] text-[#6b6b6b] shrink-0">{date}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setDismissed(true)}
            className="text-[#555555] hover:text-[#f0f0f0] transition-colors"
            aria-label="Dismiss">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
