"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AlbumRow from "@/components/album/AlbumRow";
import TrendingAlbums from "@/components/album/TrendingAlbums";
import RecentlyViewed from "@/components/album/RecentlyViewed";
import SearchFilters, { type Filter } from "@/components/search/SearchFilters";
import AlbumCard from "@/components/album/AlbumCard";
import Avatar from "@/components/ui/Avatar";
import AddFriendButton from "@/components/social/AddFriendButton";

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  type?: "album" | "single" | "ep";
}

interface BrowseAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  avgRating?: number | null;
  reviewCount?: number;
}

// Where each filter chip gets its albums. Genre hits the curated iTunes lists;
// the rest rank on real review activity in our own database.
function filterEndpoint(f: Filter): string {
  switch (f.kind) {
    case "genre": return `/api/spotify/genre?genre=${encodeURIComponent(f.genre)}`;
    case "popular": return "/api/albums/browse?sort=popular";
    case "rating": return "/api/albums/browse?sort=rating";
    case "decade": return `/api/albums/browse?decade=${f.decade}`;
    case "year": return `/api/albums/browse?year=${f.year}`;
  }
}

function filterLabel(f: Filter): string {
  switch (f.kind) {
    case "genre": return f.genre;
    case "popular": return "Most Popular";
    case "rating": return "Highest Rated";
    case "decade": return `${f.decade}s`;
    case "year": return String(f.year);
  }
}

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "album", label: "Albums" },
  { key: "ep", label: "EPs" },
  { key: "single", label: "Singles" },
] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number]["key"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [noSpotify, setNoSpotify] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [focused, setFocused] = useState(false);
  const [people, setPeople] = useState<{ id: string; username: string; avatar: string | null; bio: string | null }[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string; image: string | null; popularity: number }[]>([]);
  const [fetching, setFetching] = useState(false);

  // Browse filters (decade / year / genre / popular / rated). These are a
  // separate mode from text search: picking one takes over the idle area.
  const [filter, setFilter] = useState<Filter | null>(null);
  // Results are stored against the request they came from, so switching filters
  // shows the skeleton again without an imperative reset.
  const [browsed, setBrowsed] = useState<{ key: string; rows: BrowseAlbum[] } | null>(null);

  // Once the search bar is focused (or has a query), hide the default trending
  // strip so the screen shows only search results.
  const searching = focused || q.trim().length > 0;

  // Per-query result cache (instant repeat/back) + abort controller so a slower
  // earlier request can't overwrite the results for what's now typed.
  type SearchHit = { results: SpotifyAlbum[]; artists: typeof artists; people: typeof people; noSpotify: boolean };
  const cacheRef = useRef<Map<string, SearchHit>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  function applyHit(h: SearchHit) {
    setNoSpotify(h.noSpotify); setSearchResults(h.results); setArtists(h.artists); setPeople(h.people);
  }

  async function search(query: string) {
    const qn = query.trim();
    if (!qn) return;
    setSearched(true); setTypeFilter("all");

    // Instant from cache — no spinner, no refetch.
    const cached = cacheRef.current.get(qn.toLowerCase());
    if (cached) { abortRef.current?.abort(); applyHit(cached); setLoading(false); setFetching(false); return; }

    // Only show the full skeleton on a cold search (nothing already on screen);
    // otherwise keep the current results visible and just show a subtle spinner.
    setLoading(searchResults.length === 0 && people.length === 0 && artists.length === 0);
    setFetching(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const [albumsRes, peopleRes] = await Promise.all([
        fetch(`/api/spotify/search?q=${encodeURIComponent(qn)}`, { signal: ac.signal }).then((r) => r.json()).catch(() => ({ error: true })),
        fetch(`/api/users/search?q=${encodeURIComponent(qn)}`, { signal: ac.signal }).then((r) => r.json()).catch(() => []),
      ]);
      if (ac.signal.aborted) return; // a newer query superseded this one
      const noSp = !!albumsRes.error;
      const hit: SearchHit = {
        results: noSp ? [] : (albumsRes.results ?? []),
        artists: noSp ? [] : (albumsRes.artists ?? []),
        people: Array.isArray(peopleRes) ? peopleRes.slice(0, 6) : [],
        noSpotify: noSp,
      };
      cacheRef.current.set(qn.toLowerCase(), hit);
      applyHit(hit);
    } finally {
      if (!ac.signal.aborted) { setLoading(false); setFetching(false); }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(q);
  }

  // Live search as you type (debounced) — artists, albums, EPs & singles all
  // come back in the one query, so results appear without pressing Search.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    // Cached queries resolve instantly; otherwise a short debounce.
    const t = setTimeout(() => search(query), cacheRef.current.has(query.toLowerCase()) ? 0 : 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Load albums for the active browse filter. The genre endpoint returns a
  // different shape ({ id, ... }) than our own browse route, so normalise here.
  const filterKey = filter ? filterEndpoint(filter) : null;

  useEffect(() => {
    if (!filterKey) return;
    let live = true;
    fetch(filterKey)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const list = Array.isArray(d) ? d : [];
        setBrowsed({
          key: filterKey,
          rows: list.map((a: Record<string, unknown>) => ({
            spotifyId: String(a.spotifyId ?? a.id ?? ""),
            title: String(a.title ?? ""),
            artist: String(a.artist ?? ""),
            artwork: (a.artwork as string | null) ?? null,
            year: (a.year as number | null) ?? null,
            avgRating: (a.avgRating as number | null) ?? null,
            reviewCount: (a.reviewCount as number | undefined) ?? undefined,
          })).filter((a) => a.spotifyId && a.title),
        });
      })
      .catch(() => { if (live) setBrowsed({ key: filterKey, rows: [] }); });
    return () => { live = false; };
  }, [filterKey]);

  // Null while the active filter's results are still in flight.
  const filterRows = filterKey && browsed?.key === filterKey ? browsed.rows : null;

  const showSearchResults = searchResults.length > 0;
  // Typing takes precedence over a browse filter.
  const browsing = filter !== null && !searching && !searched;

  return (
    <div className="max-w-4xl mx-auto px-5 pt-3 pb-12">
      {/* Search bar — pinned to the top; live results, no submit button */}
      <form onSubmit={handleSubmit} className="mb-5">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search SETLST…"
            autoComplete="off"
            autoCorrect="off"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
          />
          {fetching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#3a3a3a] border-t-[#c4a832] animate-spin" aria-hidden />
          )}
        </div>
      </form>

      {/* Browse filters — between the search bar and Recently Viewed. Hidden
          while text-searching so the two modes don't compete. */}
      {!searching && !searched && (
        <SearchFilters active={filter} onChange={setFilter} />
      )}

      {/* Type filter — next to the search bar, shown when there are search results */}
      {showSearchResults && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-[#6b6b6b] mr-1">Filter:</span>
          {TYPE_FILTERS.map(({ key, label }) => {
            const count = key === "all"
              ? searchResults.length
              : searchResults.filter((a) => (a.type ?? "album") === key).length;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                  typeFilter === key
                    ? "bg-[#c4a832] border-[#c4a832] text-[#111111]"
                    : "bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
                }`}
              >
                {label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {noSpotify && (
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 text-center">
          <p className="text-[#a0a0a0] text-sm mb-1">Spotify not configured</p>
          <p className="text-[#6b6b6b] text-xs">Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] p-2.5">
              <div className="h-16 w-16 shrink-0 rounded-md bg-[#222222] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 rounded bg-[#222222] animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-[#222222] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && !loading && !noSpotify && !showSearchResults && people.length === 0 && (
        <p className="text-[#6b6b6b] text-center py-10 text-sm">No results found</p>
      )}

      {/* People results — add friends right from search */}
      {!loading && searched && people.length > 0 && (
        <div className="mb-7">
          <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">People</p>
          <div className="space-y-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl transition-colors">
                <Link href={`/profile/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <Avatar username={p.username} avatar={p.avatar} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{p.username}</p>
                    {p.bio && <p className="text-xs text-[#a0a0a0] truncate">{p.bio}</p>}
                  </div>
                </Link>
                <AddFriendButton username={p.username} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text search results */}
      {!loading && showSearchResults && (
        <>
          {/* Most popular matching artists first (Spotify popularity-ranked) */}
          {artists.length > 0 && (
            <div className="mb-7">
              <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">Artists</p>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {artists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artist/${encodeURIComponent(a.name)}`}
                    className="shrink-0 w-20 text-center group"
                  >
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-1.5 group-hover:ring-2 ring-[#c4a832] transition-all" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#222222] mx-auto mb-1.5" />
                    )}
                    <p className="text-xs text-[#a0a0a0] group-hover:text-[#c4a832] transition-colors truncate">{a.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(() => {
            const filtered = typeFilter === "all"
              ? searchResults
              : searchResults.filter((a) => (a.type ?? "album") === typeFilter);
            if (filtered.length === 0) {
              return <p className="text-[#6b6b6b] text-center py-10 text-sm">No {typeFilter}s found for this search.</p>;
            }
            return (
              <div className="space-y-2">
                {filtered.map((a) => (
                  <AlbumRow
                    key={a.id}
                    spotifyId={a.id}
                    title={a.name}
                    artist={a.artists.map((x) => x.name).join(", ")}
                    artwork={a.images[0]?.url}
                    year={a.release_date ? parseInt(a.release_date) : undefined}
                  />
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* Browse results — replace the idle content while a filter is active */}
      {browsing && (
        <div className="mb-8">
          <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-4">
            {filterLabel(filter!)}
          </p>
          {filterRows === null ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
              ))}
            </div>
          ) : filterRows.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-5 py-8 text-center">
              <p className="text-sm text-[#a0a0a0]">
                Nothing logged for {filterLabel(filter!)} yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filterRows.map((a) => (
                <AlbumCard
                  key={a.spotifyId}
                  spotifyId={a.spotifyId}
                  title={a.title}
                  artist={a.artist}
                  artwork={a.artwork}
                  year={a.year}
                  avgRating={a.avgRating}
                  reviewCount={a.reviewCount}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Default: your own history first, then trending — both hidden once
          searching, and while a browse filter is showing results */}
      {!searched && !searching && !browsing && (
        <>
          <RecentlyViewed limit={6} />
          <TrendingAlbums
            limit={9}
            heading="Trending Now"
            fallback={
              <p className="text-center text-[#6b6b6b] text-sm py-10">
                Search for an album to start exploring.
              </p>
            }
          />
        </>
      )}
    </div>
  );
}
