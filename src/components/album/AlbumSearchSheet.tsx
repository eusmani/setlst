"use client";
import { useEffect, useRef, useState } from "react";
import Portal from "@/components/ui/Portal";
import { tapHaptic } from "@/lib/native";

export interface AlbumHit {
  id: string;
  name: string;
  artists: { name: string }[];
  images?: { url: string }[];
  release_date?: string;
}

interface Props {
  title: string;
  /** "single" closes after one pick (top 5); "multi" stays open (crates). */
  mode?: "single" | "multi";
  /** Catalogue ids already added, shown as done in "multi" mode. */
  addedIds?: Set<string>;
  onPick: (hit: AlbumHit) => void | Promise<void>;
  onClose: () => void;
}

// The album search from the Albums tab, as a full-screen sheet.
//
// Adding to your top 5 or to a crate used to mean typing into a cramped inline
// box wedged under the thing you were editing. This gives those flows the same
// room the Albums tab has — full height, full-width rows, real artwork — and
// hits the same /api/spotify/search endpoint, so results match what you'd find
// by searching normally.
export default function AlbumSearchSheet({
  title, mode = "single", addedIds, onPick, onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AlbumHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced, and the previous request is abandoned rather than left to race.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setHits([]); setSearching(false); return; }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = await res.json();
        setHits(Array.isArray(data?.results) ? data.results : []);
      } catch {
        /* aborted or offline */
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function choose(hit: AlbumHit) {
    if (addedIds?.has(hit.id)) return;
    setBusyId(hit.id);
    void tapHaptic();
    try {
      await onPick(hit);
      if (mode === "single") onClose();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] bg-[#111111] flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-[#1f1f1f] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="max-w-2xl mx-auto w-full px-4 pb-3 flex items-center gap-3">
            <h2 className="text-[15px] text-[#f0f0f0] font-semibold flex-1 truncate">{title}</h2>
            <button onClick={onClose} className="text-sm text-[#c4a832] px-1 py-1">Done</button>
          </div>
          <div className="max-w-2xl mx-auto w-full px-4 pb-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search albums or artists…"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-[#1c1c1c] border border-[#2e2e2e] text-[#f0f0f0] rounded-xl px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b]"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-2xl mx-auto w-full px-4 py-3">
            {query.trim().length < 2 ? (
              <p className="text-center text-sm text-[#6b6b6b] py-16">
                Search the full album catalogue.
              </p>
            ) : searching && hits.length === 0 ? (
              <p className="text-center text-sm text-[#6b6b6b] py-16">Searching…</p>
            ) : hits.length === 0 ? (
              <p className="text-center text-sm text-[#6b6b6b] py-16">No albums found.</p>
            ) : (
              <div className="space-y-1">
                {hits.map((hit) => {
                  const added = addedIds?.has(hit.id) ?? false;
                  return (
                    <button
                      key={hit.id}
                      onClick={() => choose(hit)}
                      disabled={added || busyId === hit.id}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left disabled:opacity-60"
                    >
                      {hit.images?.[0]?.url ? (
                        <img src={hit.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#222222] shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[#f0f0f0] truncate">{hit.name}</span>
                        <span className="block text-xs text-[#a0a0a0] truncate">
                          {hit.artists?.map((a) => a.name).join(", ")}
                          {hit.release_date ? ` · ${hit.release_date.slice(0, 4)}` : ""}
                        </span>
                      </span>
                      <span className={`shrink-0 text-xs px-3 py-1.5 rounded-full ${
                        added ? "text-[#6b6b6b] border border-[#2e2e2e]" : "bg-[#c4a832] text-[#141414] font-semibold"
                      }`}>
                        {added ? "Added" : busyId === hit.id ? "…" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
