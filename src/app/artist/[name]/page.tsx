import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { isCollaborationCredit } from "@/lib/credits";
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

// Releases that aren't the artist's own work, plus unofficial pressings.
//
// The bootleg half is deliberately narrow. The obvious wider net — live, in
// concert, broadcast, BBC, demos, unreleased — is wrong: iTunes sells licensed
// music, so "Live at the BBC", "Live at the Hollywood Bowl" and "Suspiria
// (Unreleased Material)" are all official records that people would notice
// missing. Only wording that states the release is unofficial is matched.
//
// One known cost: The Beatles' officially-released "Bootleg Recordings 1963"
// is caught by its own title. One real album lost is a better trade than a
// pattern loose enough to strip every live record in the catalogue.
const BAD = /\b(karaoke|tribute|made famous|cover version|string quartet|instrumental|8-bit|parody|parodies|spoof|bootleg|unofficial|not for resale|promo only)\b/i;

// Fold accents before stripping punctuation. Removing non-alphanumerics alone
// deleted the accented letter outright, so "Beyoncé" became "beyonc" and never
// matched a request for "Beyonce" — the artist page came back empty for every
// artist whose name carries a diacritic.
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Cached iTunes responses, kept in-process and only ever populated with data. */
const ITUNES_MEMO = new Map<string, { at: number; data: { results?: unknown[] } }>();
const ITUNES_TTL = 6 * 60 * 60 * 1000;

/**
 * Fetch JSON from iTunes, never remembering an empty answer.
 *
 * This is the second attempt at the same bug: artists whose page stayed
 * permanently blank while others were fine. The first fix assumed a throttled
 * request fails visibly, and retried when the response wasn't ok. It doesn't —
 * iTunes answers HTTP 200 with `results: []`. Next's data cache stored that as
 * a perfectly good response and served it for the full revalidate window, so
 * the retry never ran and the page stayed empty for a day.
 *
 * Caching is done here instead, on one rule: only a response that actually
 * contains results is remembered. An empty or failed reply is never stored, so
 * the next request tries again rather than inheriting the emptiness. Being
 * in-process it's per-instance, which is the right trade for a cache whose job
 * is to avoid re-asking for data we already have.
 */
async function itunes<T>(url: string): Promise<{ results?: T[] } | null> {
  const hit = ITUNES_MEMO.get(url);
  if (hit && Date.now() - hit.at < ITUNES_TTL) return hit.data as { results?: T[] };

  try {
    // Deliberately uncached at the fetch layer: the whole failure above came
    // from Next persisting a response that looked fine and wasn't.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.results) && data.results.length > 0) {
      ITUNES_MEMO.set(url, { at: Date.now(), data });
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Every iTunes artist id whose name matches exactly.
 *
 * Plural on purpose. Artist names aren't unique and the catalogue's ordering
 * isn't stable, so taking the first match is a coin toss: "Zedd" matches both
 * the artist with 88 releases and a different act with 3, and whichever came
 * back first decided whether the page had a discography. Same shape as the
 * three bands called Geese.
 *
 * Capped, because the candidates are looked up in parallel and a common word
 * can match many acts.
 */
async function resolveArtistIds(name: string): Promise<number[]> {
  const data = await itunes<{ artistId?: number; artistName?: string }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=15`
  );
  const want = norm(name);
  const ids = (data?.results ?? [])
    .filter((a) => a.artistName && a.artistId && norm(a.artistName) === want)
    .map((a) => a.artistId as number);
  return [...new Set(ids)].slice(0, 4);
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

type Discography = ReturnType<typeof mapAlbums>;

/**
 * Keep the last discography that actually had releases in it.
 *
 * The artist page is assembled from a live iTunes call, so anything that makes
 * that call come back empty renders as "No releases found". Three different
 * causes produced that identical blank page — a throttle answering 200 with no
 * results, a name whose accents didn't normalise, a stale cached failure — and
 * each was only found when someone hit it.
 *
 * So rather than a fourth fix for a fourth cause, the successful answer is
 * stored and served whenever a later one comes back empty. Writing is
 * best-effort: a page that rendered fine should never fail because we couldn't
 * record it.
 */
/** Keys written recently by this instance, so a popular artist isn't re-saved per view. */
const WROTE = new Map<string, number>();
const WRITE_EVERY = 60 * 60 * 1000;

function remember(artist: string, albums: Discography): Discography {
  const key = norm(artist);
  const last = WROTE.get(key);
  if (!key || (last && Date.now() - last < WRITE_EVERY)) return albums;
  WROTE.set(key, Date.now());

  // after() runs once the response has been sent. Awaiting the upsert on the
  // render path cost about a second per view — a cross-region Turso write, paid
  // by the reader, to save data the reader already has. The point of the cache
  // is the *next* request, so nobody should wait for it.
  after(async () => {
    try {
      const payload = JSON.stringify(albums);
      await prisma.artistDiscographyCache.upsert({
        where: { name: key },
        create: { name: key, payload },
        update: { payload, updatedAt: new Date() },
      });
    } catch {
      /* cache is an optimisation, never a requirement */
      WROTE.delete(key);
    }
  });
  return albums;
}

/** The stored discography for an artist, or an empty list if we've never had one. */
async function lastKnownGood(artist: string): Promise<Discography> {
  const key = norm(artist);
  if (!key) return [];
  try {
    const row = await prisma.artistDiscographyCache.findUnique({ where: { name: key } });
    return row ? (JSON.parse(row.payload) as Discography) : [];
  } catch {
    return [];
  }
}

async function getDiscography(artist: string) {
  try {
    const artistIds = await resolveArtistIds(artist);

    // Two passes, because neither finds everything on its own:
    //
    //  1. lookup by artist id — reliable for releases this artist headlines, and
    //     the only way to be sure it's the right artist of that name;
    //  2. a name search — the only way to reach collaborations, which iTunes
    //     files under a single artistId (usually the first name credited), so
    //     the id lookup misses them from the other artist's side entirely.
    //
    // Both run in parallel and are merged; mapAlbums de-duplicates.
    const [byIdResults, byName] = await Promise.all([
      Promise.all(
        artistIds.map(async (id) => {
          const data = await itunes<ItunesAlbum>(
            `https://itunes.apple.com/lookup?id=${id}&entity=album&limit=100`
          );
          return (data?.results ?? []).filter((r) => r.collectionId && r.artistId === id);
        })
      ),
      itunes<ItunesAlbum>(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=album&limit=100`),
    ]);

    // The candidate with the biggest catalogue is the artist people mean. It
    // also can't be decided by the order iTunes happened to return the names in.
    const headlined: ItunesAlbum[] = byIdResults.sort((a, b) => b.length - a.length)[0] ?? [];

    // Shared credits only.
    //
    // Matching on "is this artist one of the credited names" was too loose:
    // artist names aren't unique — iTunes lists three separate bands called
    // Geese — so every one of them landed on the same page. A release credited
    // to one act alone is either already in the id lookup above or belongs to a
    // different artist of that name; only a credit naming two or more acts needs
    // reaching by name, because its id can only belong to one of them.
    const collaborations: ItunesAlbum[] = (byName?.results ?? []).filter(
      (a: ItunesAlbum) => a.collectionId && isCollaborationCredit(a.artistName, a.collectionName, artist)
    );

    const merged = mapAlbums([...headlined, ...collaborations]);
    if (merged.length > 0) return remember(artist, merged);

    // Nothing matched precisely — usually the id lookup failed. Rather than
    // showing an empty discography, fall back to exact-name matches, then keep
    // only the largest single artistId among them. Merging every match was how
    // the fallback reintroduced the very problem above: with three bands called
    // Geese it returned all three catalogues at once. Picking the busiest id
    // gives one artist's records, which is at worst the wrong one of that name
    // rather than a mixture of all of them.
    const want = norm(artist);
    const exact: ItunesAlbum[] = (byName?.results ?? []).filter(
      (a: ItunesAlbum) => a.collectionId && a.artistName && norm(a.artistName) === want
    );
    const byArtist = new Map<number, ItunesAlbum[]>();
    for (const a of exact) {
      const id = a.artistId ?? 0;
      byArtist.set(id, [...(byArtist.get(id) ?? []), a]);
    }
    const biggest = [...byArtist.values()].sort((x, y) => y.length - x.length)[0] ?? [];
    const loose = mapAlbums(biggest);
    // Still nothing. Rather than render "No releases found" — which has been
    // wrong far more often than it's been right — fall back to the last copy we
    // successfully fetched for this artist.
    return loose.length > 0 ? remember(artist, loose) : await lastKnownGood(artist);
  } catch {
    // An outage shouldn't empty a page we've already filled once.
    return await lastKnownGood(artist);
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
