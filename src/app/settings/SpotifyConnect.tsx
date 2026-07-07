"use client";
import { useEffect, useState } from "react";

// Connect / disconnect the user's Spotify account (listening-based recs + concerts).
export default function SpotifyConnect() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/spotify/status").then((r) => r.json()).then((d) => setConnected(!!d.connected)).catch(() => setConnected(false));
  }, []);

  async function disconnect() {
    await fetch("/api/spotify/status", { method: "POST" });
    setConnected(false);
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-5 mb-5">
      <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Spotify</h2>
      <div className="flex items-center gap-3">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#1DB954" className="shrink-0"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#f0f0f0]">{connected ? "Connected" : "Not connected"}</p>
          <p className="text-xs text-[#6b6b6b]">Album picks & concerts based on your listening history.</p>
        </div>
        {connected === null ? null : connected ? (
          <button onClick={disconnect} className="shrink-0 text-xs text-[#a0a0a0] hover:text-red-400 border border-[#2e2e2e] rounded-full px-3 py-1.5 transition-colors">Disconnect</button>
        ) : (
          <a href="/api/spotify/connect" className="shrink-0 text-xs font-semibold bg-[#1DB954] text-black rounded-full px-3.5 py-1.5">Connect</a>
        )}
      </div>
    </div>
  );
}
