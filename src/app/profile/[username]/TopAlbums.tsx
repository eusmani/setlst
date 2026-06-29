"use client";
import { useState } from "react";
import Link from "next/link";

interface FavoriteAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
}

interface SpotifyResult {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
}

interface Props {
  initial: FavoriteAlbum[];
  isOwner: boolean;
}

export default function TopAlbums({ initial, isOwner }: Props) {
  const [albums, setAlbums] = useState<FavoriteAlbum[]>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FavoriteAlbum[]>(initial);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const slots = Array.from({ length: 5 }, (_, i) => draft[i] ?? null);

  async function runSearch(q: string) {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    setResults(d.results ?? []);
    setSearching(false);
  }

  function pick(r: SpotifyResult) {
    if (activeSlot == null) return;
    const album: FavoriteAlbum = {
      spotifyId: r.id,
      title: r.name,
      artist: r.artists.map((a) => a.name).join(", "),
      artwork: r.images?.[0]?.url ?? null,
    };
    const next = [...draft];
    next[activeSlot] = album;
    setDraft(next.filter(Boolean) as FavoriteAlbum[]);
    setActiveSlot(null);
    setQuery("");
    setResults([]);
  }

  function removeSlot(i: number) {
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/user/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albums: draft }),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.error) {
      setAlbums(d.albums);
      setEditing(false);
      setActiveSlot(null);
    }
  }

  function cancel() {
    setDraft(albums);
    setEditing(false);
    setActiveSlot(null);
    setQuery("");
    setResults([]);
  }

  // Read-only view (visitors, or owner not editing) with no favorites
  if (!editing && albums.length === 0 && !isOwner) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em]">Favorite Albums</h2>
        {isOwner && !editing && (
          <button onClick={() => { setDraft(albums); setEditing(true); }}
            className="text-[10px] text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
            {albums.length ? "Edit" : "Add favorites"}
          </button>
        )}
        {isOwner && editing && (
          <div className="flex items-center gap-3">
            <button onClick={cancel} className="text-[10px] text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="text-[10px] text-[#c4a832] hover:underline disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Read-only display */}
      {!editing && (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {albums.map((a) => (
            <Link
              key={a.spotifyId}
              href={`/album/${a.spotifyId}?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}${a.artwork ? `&artwork=${encodeURIComponent(a.artwork)}` : ""}`}
              className="group"
            >
              <div className="aspect-square rounded-md overflow-hidden bg-[#1a1a1a] border border-[#1f1f1f] group-hover:border-[#c4a832] transition-colors">
                {a.artwork ? (
                  <img src={a.artwork} alt={a.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#3a3a3a] text-xs">?</div>
                )}
              </div>
              <p className="text-[10px] text-[#a0a0a0] truncate mt-1 group-hover:text-[#f0f0f0] transition-colors">{a.title}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <>
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-4">
            {slots.map((a, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => { setActiveSlot(i); setQuery(""); setResults([]); }}
                  className={`aspect-square w-full rounded-md overflow-hidden border transition-colors ${
                    activeSlot === i ? "border-[#c4a832]" : "border-[#2e2e2e] hover:border-[#c4a832]"
                  } ${a ? "" : "bg-[#1a1a1a] flex items-center justify-center"}`}
                >
                  {a?.artwork ? (
                    <img src={a.artwork} alt={a.title} className="w-full h-full object-cover" />
                  ) : a ? (
                    <div className="w-full h-full bg-[#222222]" />
                  ) : (
                    <span className="text-2xl text-[#3a3a3a]">+</span>
                  )}
                </button>
                {a && (
                  <button onClick={() => removeSlot(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#222222] border border-[#2e2e2e] text-[#a0a0a0] hover:text-red-400 flex items-center justify-center text-xs">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {activeSlot !== null && (
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-4">
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
                placeholder={`Search album for slot ${activeSlot + 1}…`}
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] mb-3"
              />
              {searching ? (
                <p className="text-xs text-[#6b6b6b] text-center py-3">Searching…</p>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto">
                  {results.map((r) => (
                    <button key={r.id} onClick={() => pick(r)} className="group text-left">
                      <div className="aspect-square rounded overflow-hidden bg-[#222222] border border-transparent group-hover:border-[#c4a832] transition-colors">
                        {r.images?.[0]?.url && <img src={r.images[0].url} alt={r.name} className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[9px] text-[#a0a0a0] truncate mt-0.5">{r.name}</p>
                    </button>
                  ))}
                </div>
              ) : query ? (
                <p className="text-xs text-[#6b6b6b] text-center py-3">No results</p>
              ) : (
                <p className="text-xs text-[#6b6b6b] text-center py-3">Type to search Spotify</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
