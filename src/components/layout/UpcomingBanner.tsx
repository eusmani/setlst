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
        // Resolve the actual album on Spotify so the ad opens it directly.
        fetch(`/api/spotify/resolve?title=${encodeURIComponent(nearest.title)}&artist=${encodeURIComponent(nearest.artist)}`)
          .then((r) => r.json())
          .then((sp: { url?: string; image?: string | null } | null) => {
            if (sp?.url) setRelease({ ...nearest, spotifyUrl: sp.url, artwork: sp.image ?? nearest.artwork });
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  // Only on the home screen — it must disappear when you open any other screen
  // so it never overlaps other tabs' UI.
  if (pathname !== "/" || !release || dismissed) return null;

  return (
    <div
      className="relative bg-gradient-to-r from-[#1DB954]/20 via-[#0c0c0c] to-[#0c0c0c] border-b border-[#1DB954]/25 overflow-hidden"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      <div className="relative z-10 max-w-4xl mx-auto px-5 py-2 flex items-center gap-3">
        {release.artwork && (
          <a href={release.spotifyUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={release.artwork} alt={release.title} width={40} height={40}
              className="rounded w-10 h-10 object-cover ring-1 ring-white/10" />
          </a>
        )}
        <div className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-[9px] text-[#1DB954] font-bold uppercase tracking-[0.18em] mb-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 1 1-.28-1.21c3.8-.87 7.07-.5 9.71 1.11.3.18.39.57.22.85zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.56 11.24 1.33.37.22.49.7.25 1.07zm.11-2.85C14.73 8.98 9.6 8.8 6.66 9.69a.93.93 0 1 1-.54-1.78c3.38-1.02 9.04-.82 12.61 1.29a.93.93 0 1 1-.95 1.6z" />
            </svg>
            New on Spotify
          </span>
          <p className="text-sm text-white font-extrabold truncate leading-tight tracking-tight">
            {release.title}
            <span className="text-[#b3b3b3] font-semibold"> · {release.artist}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={release.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 1 1-.28-1.21c3.8-.87 7.07-.5 9.71 1.11.3.18.39.57.22.85zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.56 11.24 1.33.37.22.49.7.25 1.07zm.11-2.85C14.73 8.98 9.6 8.8 6.66 9.69a.93.93 0 1 1-.54-1.78c3.38-1.02 9.04-.82 12.61 1.29a.93.93 0 1 1-.95 1.6z" />
            </svg>
            <span className="hidden sm:inline">Listen on Spotify</span>
          </a>
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
