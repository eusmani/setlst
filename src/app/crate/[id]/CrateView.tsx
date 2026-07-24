"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CrateCover from "@/components/crate/CrateCover";

interface Album {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}
interface CrateData {
  id: string;
  name: string;
  cover: string | null;
  username: string;
  albums: Album[];
}

// A Spotify search hit, as returned by /api/spotify/search.
interface SearchHit {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
}

// Resize an uploaded image to a small square data URL (no external storage).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function albumHref(a: Album) {
  const p = new URLSearchParams({ title: a.title, artist: a.artist });
  if (a.artwork) p.set("artwork", a.artwork);
  if (a.year) p.set("year", String(a.year));
  return `/album/${a.spotifyId}?${p.toString()}`;
}

export default function CrateView({ crate, isOwner }: { crate: CrateData; isOwner: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(crate.name);
  const [cover, setCover] = useState(crate.cover);
  const [albums, setAlbums] = useState(crate.albums);
  const fileRef = useRef<HTMLInputElement>(null);

  // Inline "add albums" picker — the playlist-style way to fill a crate without
  // leaving it.
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inCrate = new Set(albums.map((a) => a.spotifyId));

  async function patch(data: Record<string, unknown>) {
    await fetch("/api/crates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crate.id, ...data }),
    });
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setCover(dataUrl);
    await patch({ cover: dataUrl });
  }

  async function removeCover() {
    setCover(null);
    await patch({ cover: null });
  }

  async function rename() {
    const next = prompt("Rename crate", name)?.trim();
    if (!next || next === name) return;
    setName(next);
    await patch({ name: next });
  }

  // Debounced album search while the picker is open. All state changes happen
  // inside the timeout so none run synchronously during the effect (which would
  // cascade renders).
  useEffect(() => {
    if (!adding) return;
    const query = q.trim();
    const t = setTimeout(async () => {
      if (query.length < 2) { setHits([]); setSearching(false); return; }
      setSearching(true);
      try {
        const d = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`).then((r) => r.json());
        setHits(Array.isArray(d.results) ? d.results.slice(0, 12) : []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, adding]);

  async function addAlbum(h: SearchHit) {
    if (inCrate.has(h.id)) return;
    const album: Album = {
      id: `tmp-${h.id}`,
      spotifyId: h.id,
      title: h.name,
      artist: h.artists.map((x) => x.name).join(", "),
      artwork: h.images?.[0]?.url ?? null,
      year: h.release_date ? parseInt(h.release_date) : null,
    };
    // Optimistic: show it at the top immediately.
    setAlbums((list) => [album, ...list]);
    await fetch("/api/crates/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crateId: crate.id, spotifyId: album.spotifyId, title: album.title,
        artist: album.artist, artwork: album.artwork, year: album.year,
      }),
    });
  }

  async function removeAlbum(a: Album) {
    setAlbums((list) => list.filter((x) => x.spotifyId !== a.spotifyId));
    await fetch(`/api/crates/albums?crateId=${crate.id}&spotifyId=${encodeURIComponent(a.spotifyId)}`, { method: "DELETE" });
  }

  async function deleteCrate() {
    if (!confirm("Delete this crate?")) return;
    await fetch(`/api/crates?id=${crate.id}`, { method: "DELETE" });
    router.push(`/profile/${crate.username}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      <Link href={`/profile/${crate.username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
        ← {crate.username}&apos;s profile
      </Link>

      {/* Playlist-style header */}
      <div className="flex gap-4 mt-4 mb-6">
        <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-[#1f1f1f]">
          <CrateCover cover={cover} albums={albums} />
        </div>
        <div className="min-w-0 flex flex-col justify-end">
          <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-1">Crate</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#f0f0f0] leading-tight break-words">{name}</h1>
          <p className="text-xs text-[#a0a0a0] mt-1">{albums.length} {albums.length === 1 ? "album" : "albums"}</p>

          {isOwner && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
              <button onClick={() => fileRef.current?.click()} className="text-[#c4a832] hover:underline">
                {cover ? "Change photo" : "Add custom photo"}
              </button>
              {cover && <button onClick={removeCover} className="text-[#6b6b6b] hover:text-[#f0f0f0]">Use album collage</button>}
              <button onClick={rename} className="text-[#6b6b6b] hover:text-[#f0f0f0]">Rename</button>
              <button onClick={deleteCrate} className="text-[#6b6b6b] hover:text-red-400">Delete</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
            </div>
          )}
        </div>
      </div>

      {/* Add-albums button + inline search (owner only) */}
      {isOwner && (
        <div className="mb-5">
          <button
            onClick={() => { setAdding((v) => !v); setQ(""); setHits([]); }}
            className="flex items-center gap-2 bg-[#c4a832] hover:bg-[#d4b842] text-[#111111] text-sm font-medium py-2.5 px-4 rounded-full transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {adding ? "Done" : "Add albums"}
          </button>

          {adding && (
            <div className="mt-3 rounded-xl border border-[#2e2e2e] bg-[#151515] p-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search albums to add…"
                className="w-full bg-[#1a1a1a] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b]"
              />
              <div className="mt-2 max-h-80 overflow-y-auto space-y-1">
                {searching && hits.length === 0 && (
                  <p className="px-2 py-3 text-xs text-[#6b6b6b]">Searching…</p>
                )}
                {!searching && q.trim().length >= 2 && hits.length === 0 && (
                  <p className="px-2 py-3 text-xs text-[#6b6b6b]">No albums found.</p>
                )}
                {hits.map((h) => {
                  const added = inCrate.has(h.id);
                  return (
                    <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors">
                      {h.images?.[0]?.url ? (
                        <img src={h.images[0].url} alt={h.name} className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#222222] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#f0f0f0] truncate">{h.name}</p>
                        <p className="text-xs text-[#a0a0a0] truncate">{h.artists.map((x) => x.name).join(", ")}{h.release_date ? ` · ${h.release_date.slice(0, 4)}` : ""}</p>
                      </div>
                      <button
                        onClick={() => addAlbum(h)}
                        disabled={added}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          added
                            ? "border-[#2e2e2e] text-[#6b6b6b] cursor-default"
                            : "border-[#c4a832] text-[#c4a832] hover:bg-[#c4a832] hover:text-[#111111]"
                        }`}
                      >
                        {added ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Album list — numbered playlist rows */}
      {albums.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-2">This crate is empty.</p>
          {isOwner && <p className="text-xs">Hit <span className="text-[#c4a832]">Add albums</span> to start filling it.</p>}
        </div>
      ) : (
        <div className="space-y-1">
          {albums.map((a, i) => (
            <div key={a.spotifyId} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1a1a1a] group">
              <span className="w-5 shrink-0 text-right text-xs text-[#6b6b6b] tabular-nums">{i + 1}</span>
              <Link href={albumHref(a)} className="flex items-center gap-3 flex-1 min-w-0">
                {a.artwork ? (
                  <img src={a.artwork} alt={a.title} className="w-11 h-11 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded bg-[#222222] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{a.title}</p>
                  <p className="text-xs text-[#a0a0a0] truncate">{a.artist}{a.year ? ` · ${a.year}` : ""}</p>
                </div>
              </Link>
              {isOwner && (
                <button onClick={() => removeAlbum(a)} aria-label="Remove from crate"
                  className="shrink-0 text-[#6b6b6b] hover:text-red-400 transition-colors p-1 sm:opacity-0 sm:group-hover:opacity-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
