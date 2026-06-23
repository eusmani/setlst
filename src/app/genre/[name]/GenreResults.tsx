"use client";
import { useEffect, useState } from "react";
import AlbumCard from "@/components/album/AlbumCard";
import { GENRE_TAXONOMY } from "@/lib/genres";

interface GenreAlbum {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  avgRating?: number | null;
  reviewCount?: number;
}

// Reverse lookup: any subgenre → its parent genre (which has a curated "best of" list).
const SUBGENRE_TO_PARENT = new Map<string, string>();
for (const [parent, subs] of Object.entries(GENRE_TAXONOMY)) {
  SUBGENRE_TO_PARENT.set(parent.toLowerCase(), parent);
  for (const s of subs) SUBGENRE_TO_PARENT.set(s.toLowerCase(), parent);
}

// Regex fallback for arbitrary tags not in the taxonomy.
function matchGenreKey(g: string): string | null {
  const s = g.toLowerCase();
  if (/hip ?hop|cloud rap|drill|trap|boom bap|g-?funk|phonk|grime/.test(s)) return "Hip-Hop";
  if (/\brap\b/.test(s)) return "Rap";
  if (/shoegaze|dream pop|gaze/.test(s)) return "Shoegaze";
  if (/metal|hardcore|metalcore|deathcore|grindcore|sludge|djent|mathcore/.test(s)) return "Metal";
  if (/punk|emo|screamo/.test(s)) return "Punk";
  if (/jazz|bebop|swing|bop|big band|fusion/.test(s)) return "Jazz";
  if (/soul|funk|motown|gospel/.test(s)) return "Soul";
  if (/r&b|rhythm and blues|contemporary r/.test(s)) return "R&B";
  if (/electronic|techno|house|ambient|idm|edm|trip ?hop|dnb|drum and bass|dubstep|garage|wave|synth|breakbeat|jungle|glitch/.test(s)) return "Electronic";
  if (/country|bluegrass|americana|honky|nashville|outlaw/.test(s)) return "Country";
  if (/folk|singer-songwriter|freak folk/.test(s)) return "Folk";
  if (/indie/.test(s)) return "Indie";
  if (/alternative|art rock|post-punk|post rock|noise rock|krautrock/.test(s)) return "Alternative";
  if (/grunge|hard rock|classic rock|prog|psych|\brock\b/.test(s)) return "Rock";
  if (/\bpop\b/.test(s)) return "Pop";
  if (/classical|orchestra|baroque|romantic|opera|minimalism|renaissance|medieval/.test(s)) return "Classical";
  if (/reggae|dub|ska|dancehall|rocksteady/.test(s)) return "Reggae";
  if (/blues|boogie/.test(s)) return "Blues";
  if (/latin|reggaeton|salsa|bachata|cumbia|samba|bossa|tango|mariachi|mpb/.test(s)) return "Latin";
  if (/lo-?fi|chillhop/.test(s)) return "Lo-Fi";
  return null;
}

// Always resolve to a curated genre key: exact taxonomy match → parent genre → regex.
function resolveCuratedKey(genre: string): string | null {
  return SUBGENRE_TO_PARENT.get(genre.toLowerCase()) ?? matchGenreKey(genre);
}

async function curated(key: string): Promise<GenreAlbum[]> {
  const r = await fetch(`/api/spotify/genre?genre=${encodeURIComponent(key)}`);
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

// Subgenre-specific albums from MusicBrainz genre tags (confirmed on Apple Music).
async function mbSubgenre(genre: string): Promise<GenreAlbum[]> {
  const r = await fetch(`/api/genre-mb?genre=${encodeURIComponent(genre)}`);
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

const PARENT_GENRES = new Set(Object.keys(GENRE_TAXONOMY).map((p) => p.toLowerCase()));

async function searchTerm(term: string): Promise<GenreAlbum[]> {
  const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(term)}`);
  const d = await r.json();
  return (d.results ?? []).map((a: {
    id: string; name: string; artists?: { name: string }[];
    images?: { url: string }[]; release_date?: string;
  }) => ({
    id: a.id,
    title: a.name,
    artist: a.artists?.[0]?.name ?? "",
    artwork: a.images?.[0]?.url ?? null,
    year: a.release_date ? parseInt(a.release_date) : null,
  }));
}

export default function GenreResults({ genre }: { genre: string }) {
  const [albums, setAlbums] = useState<GenreAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Broad genres → curated "best of genre". Subgenres → subgenre-specific
        // MusicBrainz albums first, then fill with the parent genre's curated list
        // so the page is never sparse.
        let res: GenreAlbum[];
        if (PARENT_GENRES.has(genre.toLowerCase())) {
          res = await curated(genre);
        } else {
          const key = resolveCuratedKey(genre);
          const [sub, parent] = await Promise.all([
            mbSubgenre(genre),
            key ? curated(key) : Promise.resolve([] as GenreAlbum[]),
          ]);
          const seen = new Set(sub.map((a) => a.id));
          res = [...sub, ...parent.filter((a) => !seen.has(a.id))];
        }
        // Last resort if nothing mapped or returned.
        if (res.length === 0) res = await searchTerm(genre);
        // de-dupe by id
        const seen = new Set<string>();
        res = res.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
        if (!cancelled) setAlbums(res);
      } catch {
        if (!cancelled) setAlbums([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [genre]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
        ))}
      </div>
    );
  }

  if (albums.length === 0) {
    return <p className="text-center text-[#6b6b6b] text-sm py-12">No albums found for this genre.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {albums.map((a) => (
        <AlbumCard
          key={a.id}
          spotifyId={a.id}
          title={a.title}
          artist={a.artist}
          artwork={a.artwork}
          year={a.year ?? undefined}
          avgRating={a.avgRating ?? null}
          reviewCount={a.reviewCount}
        />
      ))}
    </div>
  );
}
