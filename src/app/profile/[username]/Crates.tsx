"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CrateAlbum {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}
interface Crate {
  id: string;
  name: string;
  albums: CrateAlbum[];
}

function albumHref(a: CrateAlbum) {
  const p = new URLSearchParams({ title: a.title, artist: a.artist });
  if (a.artwork) p.set("artwork", a.artwork);
  if (a.year) p.set("year", String(a.year));
  return `/album/${a.spotifyId}?${p.toString()}`;
}

export default function Crates({ username, isOwner }: { username: string; isOwner: boolean }) {
  const [crates, setCrates] = useState<Crate[] | null>(null);

  useEffect(() => {
    fetch(`/api/crates?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => setCrates(Array.isArray(d) ? d : []))
      .catch(() => setCrates([]));
  }, [username]);

  async function createCrate() {
    const name = prompt("Name your crate")?.trim();
    if (!name) return;
    const r = await fetch("/api/crates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (r.ok) {
      const crate = await r.json();
      setCrates((c) => [{ ...crate, albums: crate.albums ?? [] }, ...(c ?? [])]);
    }
  }

  async function deleteCrate(id: string) {
    if (!confirm("Delete this crate?")) return;
    await fetch(`/api/crates?id=${id}`, { method: "DELETE" });
    setCrates((c) => (c ?? []).filter((x) => x.id !== id));
  }

  if (crates === null) return null;
  if (!isOwner && crates.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-[#a0a0a0] uppercase tracking-[0.15em]">Crates</h2>
        {isOwner && (
          <button onClick={createCrate} className="text-xs text-[#c4a832] hover:underline">+ New crate</button>
        )}
      </div>

      {crates.length === 0 ? (
        <div className="py-8 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-1">No crates yet.</p>
          <p className="text-xs">Make a crate, then add albums from any album page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {crates.map((crate) => (
            <div key={crate.id} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-sm text-[#f0f0f0] truncate">{crate.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#6b6b6b]">{crate.albums.length}</span>
                  {isOwner && (
                    <button onClick={() => deleteCrate(crate.id)} aria-label="Delete crate"
                      className="text-[#6b6b6b] hover:text-red-400 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {crate.albums.length === 0 ? (
                <p className="text-xs text-[#6b6b6b] py-4 text-center">Empty — add albums from an album page.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {crate.albums.slice(0, 8).map((a) => (
                    <Link key={a.id} href={albumHref(a)} title={`${a.title} — ${a.artist}`} className="block group">
                      {a.artwork ? (
                        <img src={a.artwork} alt={a.title} className="w-full aspect-square rounded object-cover group-hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="w-full aspect-square rounded bg-[#222222]" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
