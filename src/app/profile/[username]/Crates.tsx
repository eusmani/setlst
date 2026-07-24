"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CrateCover from "@/components/crate/CrateCover";

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
  cover: string | null;
  albums: CrateAlbum[];
}

export default function Crates({ username, isOwner, showAll = false }: { username: string; isOwner: boolean; showAll?: boolean }) {
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
        <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em]">{isOwner ? "Your crates" : "Crates"}</h2>
        {isOwner && (
          <button onClick={createCrate} aria-label="New crate"
            className="flex items-center gap-1.5 text-xs text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full pl-2 pr-3 py-1.5 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New crate
          </button>
        )}
      </div>

      {crates.length === 0 ? (
        <div className="py-8 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-1">No crates yet.</p>
          <p className="text-xs">Make a crate, then add albums from any album page.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {(showAll ? crates : crates.slice(0, 3)).map((crate) => (
              <div key={crate.id} className="relative group">
                <Link href={`/crate/${crate.id}`} className="block">
                  <div className="rounded-xl overflow-hidden border border-[#1f1f1f] group-hover:border-[#2e2e2e] transition-colors">
                    <CrateCover cover={crate.cover} albums={crate.albums} />
                  </div>
                  <p className="mt-1.5 text-xs text-[#f0f0f0] truncate">{crate.name}</p>
                  <p className="text-[11px] text-[#6b6b6b]">{crate.albums.length} {crate.albums.length === 1 ? "album" : "albums"}</p>
                </Link>
                {isOwner && (
                  <button onClick={() => deleteCrate(crate.id)} aria-label="Delete crate"
                    className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-[#d0d0d0] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {!showAll && crates.length > 3 && (
            <div className="mt-3 flex justify-center">
              <Link href={`/profile/${username}/crates`}
                className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full px-4 py-2 transition-colors">
                See more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
