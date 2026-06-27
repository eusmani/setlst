"use client";
import { useState } from "react";
import Link from "next/link";
import AlbumCard from "@/components/album/AlbumCard";
import TrendingAlbums from "@/components/album/TrendingAlbums";
import Avatar from "@/components/ui/Avatar";
import AddFriendButton from "@/components/social/AddFriendButton";
import { GENRE_TAXONOMY } from "@/lib/genres";

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  type?: "album" | "single" | "ep";
}

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "album", label: "Albums" },
  { key: "ep", label: "EPs" },
  { key: "single", label: "Singles" },
] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number]["key"];

interface GenreAlbum {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

const GENRES = [
  "Hip-Hop", "Rap", "R&B", "Rock", "Alternative", "Indie",
  "Metal", "Jazz", "Soul", "Electronic", "Pop", "Classical",
  "Reggae", "Latin", "Blues", "Punk", "Shoegaze", "Lo-Fi",
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyAlbum[]>([]);
  const [genreResults, setGenreResults] = useState<GenreAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [noSpotify, setNoSpotify] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showSubgenres, setShowSubgenres] = useState(false);
  const [people, setPeople] = useState<{ id: string; username: string; avatar: string | null; bio: string | null }[]>([]);

  async function search(query: string) {
    if (!query.trim()) return;
    setLoading(true); setSearched(true); setActiveGenre(null); setGenreResults([]); setTypeFilter("all");
    // Search albums and people in parallel.
    const [albumsRes, peopleRes] = await Promise.all([
      fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`).then((r) => r.json()).catch(() => ({ error: true })),
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`).then((r) => r.json()).catch(() => []),
    ]);
    setLoading(false);
    if (albumsRes.error) { setNoSpotify(true); setSearchResults([]); }
    else { setNoSpotify(false); setSearchResults(albumsRes.results ?? []); }
    setPeople(Array.isArray(peopleRes) ? peopleRes.slice(0, 6) : []);
  }

  async function handleGenre(genre: string) {
    if (activeGenre === genre) {
      setActiveGenre(null); setGenreResults([]); setSearched(false); setShowAll(false);
      return;
    }
    setActiveGenre(genre); setQ(""); setSearched(true); setLoading(true);
    setSearchResults([]); setShowAll(false);
    const res = await fetch(`/api/spotify/genre?genre=${encodeURIComponent(genre)}`);
    const data = await res.json();
    setLoading(false);
    if (data.error) { setNoSpotify(true); setGenreResults([]); }
    else { setNoSpotify(false); setGenreResults(Array.isArray(data) ? data : []); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveGenre(null); setGenreResults([]);
    search(q);
  }

  const showGenreResults = activeGenre && genreResults.length > 0;
  const showSearchResults = !activeGenre && searchResults.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-5 pt-5 pb-12">
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-6">Search Albums</h1>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setActiveGenre(null); }}
          placeholder="Search SETLST…"
          className="flex-1 bg-[#1a1a1a] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-40 text-[#111111] px-6 py-3 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

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

      {/* Genre pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => handleGenre(g)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
              activeGenre === g
                ? "bg-[#c4a832] border-[#c4a832] text-[#111111]"
                : "bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Browse all subgenres → dedicated genre pages */}
      <div className="mb-8">
        <button
          onClick={() => setShowSubgenres((s) => !s)}
          className="text-xl uppercase tracking-[0.15em] text-[#a0a0a0] hover:text-[#c4a832] transition-colors flex items-center gap-1.5"
        >
          {showSubgenres ? "Hide subgenres ↑" : "Browse all subgenres ↓"}
        </button>
        {showSubgenres && (
          <div className="mt-4 space-y-4">
            {Object.entries(GENRE_TAXONOMY).map(([parent, subs]) => (
              <div key={parent}>
                <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">{parent}</p>
                <div className="flex flex-wrap gap-1.5">
                  {subs.map((s) => (
                    <Link
                      key={`${parent}-${s}`}
                      href={`/genre/${encodeURIComponent(s)}`}
                      className="px-2.5 py-1 rounded-full text-xs border bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0] transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {noSpotify && (
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 text-center">
          <p className="text-[#a0a0a0] text-sm mb-1">Spotify not configured</p>
          <p className="text-[#6b6b6b] text-xs">Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] aspect-square animate-pulse" />
          ))}
        </div>
      )}

      {searched && !loading && !noSpotify && !showSearchResults && !showGenreResults && people.length === 0 && (
        <p className="text-[#6b6b6b] text-center py-10 text-sm">No results found</p>
      )}

      {/* People results — add friends right from search */}
      {!loading && !activeGenre && searched && people.length > 0 && (
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

      {/* Genre browse results */}
      {!loading && showGenreResults && (
        <>
          <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-4">{activeGenre}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(showAll ? genreResults : genreResults.slice(0, 10)).map((a) => (
              <AlbumCard key={a.id} spotifyId={a.id} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year} />
            ))}
          </div>
          {genreResults.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 w-full py-2.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-lg transition-colors"
            >
              {showAll ? "Show less ↑" : `See more (${genreResults.length - 10} more) ↓`}
            </button>
          )}
        </>
      )}

      {/* Text search results */}
      {!loading && showSearchResults && (
        <>
          {(() => {
            // Unique artist profiles drawn from the matching albums
            const byArtist = new Map<string, string | undefined>();
            for (const a of searchResults) {
              const name = a.artists[0]?.name;
              if (name && !byArtist.has(name)) byArtist.set(name, a.images[0]?.url);
            }
            const artists = Array.from(byArtist.entries()).slice(0, 8);
            if (artists.length === 0) return null;
            return (
              <div className="mb-7">
                <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">Artists</p>
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {artists.map(([name, art]) => (
                    <Link
                      key={name}
                      href={`/artist/${encodeURIComponent(name)}`}
                      className="shrink-0 w-20 text-center group"
                    >
                      {art ? (
                        <img src={art} alt={name} className="w-20 h-20 rounded-full object-cover mx-auto mb-1.5 group-hover:ring-2 ring-[#c4a832] transition-all" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[#222222] mx-auto mb-1.5" />
                      )}
                      <p className="text-xs text-[#a0a0a0] group-hover:text-[#c4a832] transition-colors truncate">{name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
          {(() => {
            const filtered = typeFilter === "all"
              ? searchResults
              : searchResults.filter((a) => (a.type ?? "album") === typeFilter);
            if (filtered.length === 0) {
              return <p className="text-[#6b6b6b] text-center py-10 text-sm">No {typeFilter}s found for this search.</p>;
            }
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map((a) => (
                  <AlbumCard
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

      {/* Default: trending from real user activity only — no dummy albums */}
      {!searched && (
        <TrendingAlbums
          limit={9}
          heading="Trending Now"
          fallback={
            <p className="text-center text-[#6b6b6b] text-sm py-10">
              Search for an album or pick a genre to start exploring.
            </p>
          }
        />
      )}
    </div>
  );
}
