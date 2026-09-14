"use client";
import { useRef, useState } from "react";
import Link from "next/link";

interface AlbumResult {
  id: string;
  name: string;
  artists?: { name: string }[];
  images?: { url: string }[];
  release_date?: string;
}

// "Write a review" flow (entered from the mobile + button): search an album,
// tap it, and the album page opens straight into the review composer.
export default function LogPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AlbumResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); setSearched(false); return; }
    timer.current = setTimeout(() => runSearch(v), 350);
  }

  // Abandon the previous request rather than letting it race: a slower earlier
  // search could otherwise land last and overwrite the current results — which
  // reads as "this album isn't in the catalogue" for an album that is.
  async function runSearch(query: string) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setLoading(true); setSearched(true);
    try {
      const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const d = await r.json();
      if (controller.signal.aborted) return;
      setResults(Array.isArray(d.results) ? d.results : []);
    } catch {
      if (controller.signal.aborted) return;
      setResults([]);
    }
    if (!controller.signal.aborted) setLoading(false);
  }

  function href(a: AlbumResult) {
    const p = new URLSearchParams({ title: a.name, artist: a.artists?.[0]?.name ?? "" });
    if (a.images?.[0]?.url) p.set("artwork", a.images[0].url);
    if (a.release_date) p.set("year", String(parseInt(a.release_date)));
    p.set("review", "1"); // open the album page straight into the review composer
    return `/album/${a.id}?${p.toString()}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-12">
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-1">Write a review</h1>
      <p className="text-sm text-[#6b6b6b] mb-5">Search for an album, then tap it to log your review.</p>

      <div className="relative mb-6">
        <input
          autoFocus
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search albums…"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg pl-10 pr-3 py-3 text-base focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {loading && <p className="text-[#6b6b6b] text-sm text-center py-8">Searching…</p>}
      {!loading && searched && results.length === 0 && (
        <p className="text-[#6b6b6b] text-sm text-center py-8">No albums found.</p>
      )}

      <div className="space-y-2">
        {results.map((a) => (
          <Link
            key={a.id}
            href={href(a)}
            className="flex items-center gap-3 p-2.5 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#c4a832] rounded-xl transition-colors group"
          >
            {a.images?.[0]?.url ? (
              <img src={a.images[0].url} alt={a.name} className="w-12 h-12 rounded object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded bg-[#222222] shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{a.name}</p>
              <p className="text-xs text-[#a0a0a0] truncate">
                {a.artists?.[0]?.name}{a.release_date ? ` · ${parseInt(a.release_date)}` : ""}
              </p>
            </div>
            <svg className="text-[#6b6b6b] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
