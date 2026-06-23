import Link from "next/link";
import AlbumCard from "@/components/album/AlbumCard";
import FollowArtistButton from "./FollowArtistButton";
import { isLikelyAI } from "@/lib/aiFilter";

export const dynamic = "force-dynamic";

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  artistId?: number;
}

const BAD = /\b(karaoke|tribute|made famous|cover version|string quartet|instrumental|8-bit|parody|parodies|spoof)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Resolve the exact iTunes artist ID so we get THIS artist's catalog, not anyone sharing a name
async function resolveArtistId(name: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=15`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const results: { artistId?: number; artistName?: string }[] = (await res.json()).results ?? [];
    const want = norm(name);
    const exact = results.find((a) => a.artistName && norm(a.artistName) === want);
    return exact?.artistId ?? null;
  } catch {
    return null;
  }
}

// Strip reissue/edition markers so "Master of Puppets (Remastered)" → "Master of Puppets"
function cleanTitle(t: string): string {
  return t
    .replace(/\s*[([][^)\]]*\b(remaster(ed)?|remaster|expanded|deluxe|box ?set|anniversary|special edition|collector'?s|reissue|re-?issue|bonus|mono|stereo|\d{4} remaster)\b[^)\]]*[)\]]/gi, "")
    .replace(/\s*-\s*(remaster(ed)?|deluxe|expanded).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mapAlbums(results: ItunesAlbum[]) {
  const cleaned = results
    .filter((a) =>
      a.collectionId && a.collectionName && a.artistName && a.artworkUrl100 &&
      !BAD.test(a.collectionName) &&
      !isLikelyAI(a.artistName, a.collectionName)
    )
    .map((a) => ({
      id: String(a.collectionId),
      rawTitle: a.collectionName as string,
      title: cleanTitle(a.collectionName as string) || (a.collectionName as string),
      artist: a.artistName as string,
      artwork: (a.artworkUrl100 as string).replace("100x100bb", "600x600bb"),
      year: a.releaseDate ? parseInt(a.releaseDate.slice(0, 4)) : null,
      date: a.releaseDate ?? "",
    }));

  // De-duplicate editions of the same release; prefer the simplest (shortest raw) title.
  const best = new Map<string, (typeof cleaned)[number]>();
  for (const a of cleaned) {
    const key = a.title.toLowerCase();
    const cur = best.get(key);
    if (!cur || a.rawTitle.length < cur.rawTitle.length) best.set(key, a);
  }

  return Array.from(best.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ id, title, artist, artwork, year }) => ({ id, title, artist, artwork, year }));
}

async function getDiscography(artist: string) {
  try {
    // 1. Exact artist via ID — the reliable path
    const artistId = await resolveArtistId(artist);
    if (artistId) {
      const res = await fetch(
        `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=100`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        // Keep only releases where this artist is the PRIMARY artist (not features/collabs by others)
        const results: ItunesAlbum[] = ((await res.json()).results ?? []).filter(
          (r: ItunesAlbum) => r.collectionId && r.artistId === artistId
        );
        const mapped = mapAlbums(results);
        if (mapped.length > 0) return mapped;
      }
    }

    // 2. Fallback: name search requiring the FULL name to match
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=album&limit=80`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const want = norm(artist);
    const results: ItunesAlbum[] = ((await res.json()).results ?? []).filter(
      (a: ItunesAlbum) => a.artistName && norm(a.artistName).includes(want)
    );
    return mapAlbums(results);
  } catch {
    return [];
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const artist = decodeURIComponent(name);
  const albums = await getDiscography(artist);
  // Use the canonical artist name when most releases agree, else the requested name
  const displayName = albums[0]?.artist ?? artist;
  const headerName = albums.length && albums.every((a) => a.artist === albums[0].artist)
    ? displayName
    : artist;

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Link href="/search" className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors mb-6 block">
        ← Back to search
      </Link>

      <div className="flex items-center gap-5 mb-8">
        {albums[0]?.artwork ? (
          <img src={albums[0].artwork} alt={headerName} className="w-24 h-24 rounded-full object-cover shrink-0 shadow-lg" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#222222] shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-1">Artist</p>
          <h1 className="font-serif text-3xl text-[#f0f0f0] truncate">{headerName}</h1>
          <p className="text-sm text-[#6b6b6b] mt-1 mb-3">
            {albums.length} {albums.length === 1 ? "release" : "releases"} · click any to review
          </p>
          <FollowArtistButton artist={headerName} />
        </div>
      </div>

      {albums.length === 0 ? (
        <p className="text-center text-[#6b6b6b] text-sm py-12">No releases found for this artist.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {albums.map((a) => (
            <AlbumCard key={a.id} spotifyId={a.id} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year} />
          ))}
        </div>
      )}
    </div>
  );
}
