"use client";
import { useEffect, useRef, useState } from "react";

interface Album {
  spotifyId: string;
  title: string;
  artist: string;
  artwork?: string | null;
  year?: number | null;
}
interface Crate {
  id: string;
  name: string;
  albums: { spotifyId: string }[];
}

export default function AddToCrate({ album, isLoggedIn }: { album: Album; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [crates, setCrates] = useState<Crate[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || crates !== null) return;
    fetch("/api/crates").then((r) => r.json()).then((d) => setCrates(Array.isArray(d) ? d : [])).catch(() => setCrates([]));
  }, [open, crates]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!isLoggedIn) return null;

  const inCrate = (c: Crate) => c.albums.some((a) => a.spotifyId === album.spotifyId);
  const body = () => ({ crateId: "", spotifyId: album.spotifyId, title: album.title, artist: album.artist, artwork: album.artwork ?? null, year: album.year ?? null });

  async function toggle(c: Crate) {
    const has = inCrate(c);
    setCrates((cs) => (cs ?? []).map((x) => x.id === c.id
      ? { ...x, albums: has ? x.albums.filter((a) => a.spotifyId !== album.spotifyId) : [...x.albums, { spotifyId: album.spotifyId }] }
      : x));
    if (has) {
      await fetch(`/api/crates/albums?crateId=${c.id}&spotifyId=${encodeURIComponent(album.spotifyId)}`, { method: "DELETE" });
    } else {
      await fetch("/api/crates/albums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body(), crateId: c.id }) });
    }
  }

  async function createAndAdd() {
    const name = prompt("Name your crate")?.trim();
    if (!name) return;
    const r = await fetch("/api/crates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!r.ok) return;
    const crate = await r.json();
    await fetch("/api/crates/albums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body(), crateId: crate.id }) });
    setCrates((cs) => [{ id: crate.id, name: crate.name, albums: [{ spotifyId: album.spotifyId }] }, ...(cs ?? [])]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#c4a832] text-[#f0f0f0] text-sm py-2.5 rounded-lg transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
        Add to crate
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg shadow-2xl">
          {crates === null ? (
            <p className="px-4 py-3 text-xs text-[#6b6b6b]">Loading…</p>
          ) : (
            <>
              {crates.map((c) => (
                <button key={c.id} onClick={() => toggle(c)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors">
                  <span className="truncate">{c.name}</span>
                  {inCrate(c) ? (
                    <svg className="text-[#c4a832] shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg className="text-[#6b6b6b] shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  )}
                </button>
              ))}
              <button onClick={createAndAdd}
                className="w-full text-left px-4 py-2.5 text-sm text-[#c4a832] hover:bg-[#222222] border-t border-[#1f1f1f]">
                + New crate
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
