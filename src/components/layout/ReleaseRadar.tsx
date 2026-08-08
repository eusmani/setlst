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

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReleaseRadar() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("This week");

  useEffect(() => {
    // This week's NEWEST releases straight from Spotify (tag:new → last ~2 weeks),
    // newest first, de-duped by artist. Refreshes as new albums drop each week.
    (async () => {
      try {
        // no-store so the iOS webview never serves a stale cached list (which
        // could resurface a since-banned AI act).
        const list = await fetch("/api/new-releases", { cache: "no-store" }).then((r) => r.json());
        const seen = new Set<string>();
        const pick: Release[] = [];
        for (const r of (Array.isArray(list) ? list : []) as Release[]) {
          const key = r.artist.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          pick.push(r);
          if (pick.length >= 15) break;
        }
        setReleases(pick);
        setLabel("This week");
      } catch {
        setReleases([]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <section>
      {/* No card: a heading on the page with rows under it, rather than content
          boxed inside a bordered panel. Stacked panels were what made the home
          screen feel crowded. */}
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-[11px] text-[#8a8a8a] uppercase tracking-[0.18em] font-semibold">
          Release Radar
        </h2>
        <span className="ml-auto text-[10px] text-[#6b6b6b] uppercase tracking-wider">{label}</span>
      </div>

      {loading ? (
        <div className="py-6 text-xs text-[#6b6b6b]">Loading…</div>
      ) : releases.length === 0 ? (
        <div className="py-6 text-xs text-[#6b6b6b]">No releases this week — check back soon</div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto">
          {releases.slice(0, 15).map((r) => (
            <div key={r.id} className="flex gap-3">
              {r.artwork ? (
                <img
                  src={r.artwork}
                  alt={r.title}
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  className="rounded-lg w-14 h-14 object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#1c1c1c] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f0] truncate leading-snug">{r.title}</p>
                <p className="text-xs text-[#a0a0a0] truncate">{r.artist}</p>
                <p className="text-[11px] text-[#c4a832] mt-0.5">{formatDate(r.releaseDate)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={r.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#6b6b6b] hover:text-[#1DB954] transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Listen
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3">
        <a
          href="https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
        >
          New Music Friday on Spotify →
        </a>
      </div>
    </section>
  );
}
