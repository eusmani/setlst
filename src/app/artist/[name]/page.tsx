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
  trackCount?: number;
}

export type ReleaseKind = "album" | "ep" | "single";

/**
 * Album, EP or single.
 *
 * iTunes has no field for this: it marks the distinction in the title ("… -
 * Single", "… - EP") and otherwise leaves you to infer it from track count.
 * Without this everything was presented as an album, which is why singles and
 * EPs looked missing.
 */
function releaseKind(name: string, trackCount?: number): ReleaseKind {
  if (/[-–—]\s*single\s*$/i.test(name)) return "single";
  if (/[-–—]\s*ep\s*$/i.test(name) || /\bE\.?P\.?\s*$/.test(name)) return "ep";
  if (typeof trackCount === "number") {
    if (trackCount <= 2) return "single";
    if (trackCount <= 6) return "ep";
  }
  return "album";
}

/**
 * The artists actually credited on a release.
 *
 * iTunes puts collaborations in one string — "Artist A & Artist B", "Artist A
 * feat. Artist B" — and gives the release a single artistId, usually the first
 * name. Filtering on that id alone is why a collaboration only ever appeared in
 * one artist's discography. Splitting the credit lets it appear in both.
 *
 * Split, then compare whole names: "Drake & Future" yields Future, while "Drake
 * Bell" stays one name and won't be mistaken for Drake.
 *
 * The comma is the awkward one. iTunes uses it for collaborations ("Metro
 * Boomin, The Weeknd"), but some artists have it in their actual name ("Tyler,
 * The Creator", "Earth, Wind & Fire"), which splits into fragments. That only
 * misleads if a release elsewhere is credited to exactly one of those fragments,
 * which is rare — and dropping the comma would lose a common collaboration
 * format outright, so it's the better trade.
 */
function creditedArtists(artistName: string): string[] {
  return artistName
    .split(/\s*(?:,|&|\/|\bfeat\.?\b|\bfeaturing\b|\bft\.?\b|\bwith\b|\bx\b|\bvs\.?\b|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** True when `target` is one of the artists credited on the release. */
function isCreditedTo(a: ItunesAlbum, target: string): boolean {
  const want = norm(target);
  if (!want) return false;
  if (a.artistName && creditedArtists(a.artistName).some((n) => norm(n) === want)) return true;
  // Features are often only in the title: "Song (feat. Artist B) - Single".
  const feat = a.collectionName?.match(/\((?:feat\.?|featuring|ft\.?|with)\s+([^)]+)\)/i);
  if (feat) return creditedArtists(feat[1]).some((n) => norm(n) === want);
  return false;
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
      // The suffix is how the kind is detected, so classify before stripping it.
      kind: releaseKind(a.collectionName as string, a.trackCount),
      title:
        cleanTitle((a.collectionName as string).replace(/\s*[-–—]\s*(single|ep)\s*$/i, "")) ||
        (a.collectionName as string),
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
    .map(({ id, title, artist, artwork, year, kind }) => ({ id, title, artist, artwork, year, kind }));
}

async function getDiscography(artist: string) {
  try {
    const artistId = await resolveArtistId(artist);

    // Two passes, because neither finds everything on its own:
    //
    //  1. lookup by artist id — reliable for releases this artist headlines, and
    //     the only way to be sure it's the right artist of that name;
    //  2. a name search — the only way to reach collaborations, which iTunes
    //     files under a single artistId (usually the first name credited), so
    //     the id lookup misses them from the other artist's side entirely.
    //
    // Both run in parallel and are merged; mapAlbums de-duplicates.
    const [byId, byName] = await Promise.all([
      artistId
        ? fetch(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=100`, {
            next: { revalidate: 86400 },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=album&limit=100`, {
        next: { revalidate: 86400 },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const headlined: ItunesAlbum[] = (byId?.results ?? []).filter(
      (r: ItunesAlbum) => r.collectionId && r.artistId === artistId
    );

    // Anything where this artist is one of the credited names — the collaborations.
    const collaborations: ItunesAlbum[] = (byName?.results ?? []).filter(
      (a: ItunesAlbum) => a.collectionId && isCreditedTo(a, artist)
    );

    const merged = mapAlbums([...headlined, ...collaborations]);
    if (merged.length > 0) return merged;

    // Nothing matched precisely — fall back to a looser name match rather than
    // showing an empty discography.
    const want = norm(artist);
    return mapAlbums(
      (byName?.results ?? []).filter(
        (a: ItunesAlbum) => a.artistName && norm(a.artistName).includes(want)
      )
    );
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
      <Link href="/search" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors mb-6 block">
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
        // Grouped by kind: everything used to be presented as an album, so
        // singles and EPs were indistinguishable from LPs in one flat grid.
        <div className="space-y-8">
          {([
            ["album", "Albums"],
            ["ep", "EPs"],
            ["single", "Singles"],
          ] as const).map(([kind, label]) => {
            const group = albums.filter((a) => a.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="section-heading mb-3">{label}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {group.map((a) => (
                    <AlbumCard key={a.id} spotifyId={a.id} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
