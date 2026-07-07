"use client";
import { useEffect, useState } from "react";
import AlbumCard from "@/components/album/AlbumCard";

interface Album { spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null }
interface Concert { id: string; name: string; date: string; venue: string; city: string; url: string; artist: string }

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Mobile: link Spotify, then show listening-based album recs + concerts.
export default function SpotifyForYou() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetch("/api/spotify/status").then((r) => r.json()).then((d) => setConnected(!!d.connected)).catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!connected) return;
    setLoadingData(true);
    (async () => {
      try {
        const fy = await fetch("/api/spotify/for-you").then((r) => r.json());
        setAlbums(Array.isArray(fy.albums) ? fy.albums : []);
      } catch { /* ignore */ }
      // Concerts — try with location for local shows.
      try {
        let geo = "";
        try {
          const { getCoords } = await import("@/lib/native");
          const c = await getCoords();
          if (c) geo = `?lat=${c.lat}&lon=${c.lon}`;
        } catch { /* no location */ }
        const cc = await fetch(`/api/spotify/concerts${geo}`).then((r) => r.json());
        setConcerts(Array.isArray(cc.concerts) ? cc.concerts : []);
      } catch { /* ignore */ }
      setLoadingData(false);
    })();
  }, [connected]);

  if (connected === null) return null;

  // Not connected → prompt (mobile only).
  if (!connected) {
    return (
      <div className="sm:hidden bg-gradient-to-r from-[#1DB954]/15 to-[#1a1a1a] border border-[#1DB954]/30 rounded-2xl p-4 flex items-center gap-3">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#1DB954" className="shrink-0"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#f0f0f0] font-medium">Connect Spotify</p>
          <p className="text-xs text-[#a0a0a0]">Get album picks & concerts based on what you actually listen to.</p>
        </div>
        <a href="/api/spotify/connect" className="shrink-0 text-xs font-semibold bg-[#1DB954] text-black px-3 py-1.5 rounded-full">Connect</a>
      </div>
    );
  }

  // Connected but nothing yet.
  if (!loadingData && albums.length === 0 && concerts.length === 0) return null;

  return (
    <div className="sm:hidden space-y-6">
      {albums.length > 0 && (
        <div>
          <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">From your Spotify</h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {albums.map((a) => (
              <div key={a.spotifyId} className="snap-start shrink-0 w-[30%]">
                <AlbumCard spotifyId={a.spotifyId} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year ?? undefined} />
              </div>
            ))}
          </div>
        </div>
      )}

      {concerts.length > 0 && (
        <div>
          <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Concerts for you</h2>
          <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl divide-y divide-[#1f1f1f] overflow-hidden">
            {concerts.slice(0, 8).map((c) => (
              <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#222222] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#222222] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="1.6"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#f0f0f0] truncate">{c.artist}</p>
                  <p className="text-xs text-[#a0a0a0] truncate">{c.venue}{c.city ? ` · ${c.city}` : ""}</p>
                </div>
                <span className="text-[11px] text-[#c4a832] shrink-0">{c.date ? fmtDate(c.date) : ""}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
