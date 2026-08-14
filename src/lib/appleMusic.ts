import crypto from "crypto";

// Apple Music (MusicKit) catalog client. Uses the full Apple Music catalog via a
// developer token — unlike the legacy iTunes Search API, this reliably returns
// canonical albums (e.g. Madvillainy, Bandana) that iTunes' search omits.

// Cached developer token, regenerated before it expires (max 6 months per Apple).
let cached: { token: string; exp: number } | null = null;

function developerToken(): string | null {
  if (cached && Date.now() < cached.exp) return cached.token;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const p8 = process.env.APPLE_MUSIC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !p8) return null;
  const b64 = (b: string | Buffer) =>
    Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15000000; // ~173 days, under the 6-month cap
  const header = b64(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = b64(JSON.stringify({ iss: teamId, iat: now, exp }));
  const sig = crypto.sign("SHA256", Buffer.from(`${header}.${payload}`), { key: p8, dsaEncoding: "ieee-p1363" });
  const token = `${header}.${payload}.${b64(sig)}`;
  cached = { token, exp: (exp - 3600) * 1000 };
  return token;
}

export function appleMusicConfigured(): boolean {
  return !!(process.env.APPLE_MUSIC_KEY_ID && process.env.APPLE_MUSIC_TEAM_ID && process.env.APPLE_MUSIC_PRIVATE_KEY);
}

export interface AppleAlbum {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

interface AMAlbum {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    releaseDate?: string;
    artwork?: { url?: string };
    isSingle?: boolean;
  };
}

const norm = (s: string) => " " + s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
// Non-canonical editions that share a name+artist (so they tie on word overlap).
const VARIANT = /instrumental|\bbeats\b|remix|deluxe|\blive\b|karaoke|\bversion\b|\bedition\b|\bdemos?\b|commentary|b.?sides?|screwed|chopped|slowed|acoustic|reprise/i;

function artworkUrl(url?: string): string | null {
  if (!url) return null;
  return url.replace("{w}", "600").replace("{h}", "600");
}

// Best-matching album from the Apple Music catalog for a "Title Artist" query.
// Returns null when Apple Music isn't configured or there's no real match (caller
// can fall back to iTunes).
export async function searchAppleAlbum(query: string): Promise<AppleAlbum | null> {
  const token = developerToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(
      "https://api.music.apple.com/v1/catalog/us/search?" +
        new URLSearchParams({ term: query, types: "albums", limit: "5" }),
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 604800 } }
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const albums: AMAlbum[] = (await res.json())?.results?.albums?.data ?? [];

  const qWords = norm(query).trim().split(" ").filter((w) => w.length > 1);
  const qWantsVariant = VARIANT.test(query);
  const scoreOf = (a: AMAlbum) => {
    const name = a.attributes?.name ?? "";
    const hay = norm(`${name} ${a.attributes?.artistName ?? ""}`);
    let s = qWords.reduce((n, w) => n + (hay.includes(" " + w + " ") ? 1 : 0), 0);
    if (!qWantsVariant && VARIANT.test(name)) s -= 1;
    return s;
  };
  const best = albums
    .filter((a) => a.attributes?.name && a.attributes?.artistName && a.attributes?.artwork?.url)
    .map((a) => ({ a, s: scoreOf(a) }))
    .sort((p, r) => r.s - p.s)[0];
  if (!best || best.s <= 0) return null;

  const at = best.a.attributes!;
  return {
    id: best.a.id,
    title: at.name as string,
    artist: at.artistName as string,
    artwork: artworkUrl(at.artwork?.url),
    year: at.releaseDate ? parseInt(at.releaseDate.slice(0, 4)) : null,
  };
}

// ---------------------------------------------------------------------------
// Artist discography
// ---------------------------------------------------------------------------

/** A release in the shape the artist page already maps from iTunes. */
export interface AppleArtistRelease {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  releaseDate: string;
  trackCount?: number;
  artistId?: number;
}

interface AMArtist { id: string; attributes?: { name?: string } }
interface AMFullAlbum {
  id: string;
  attributes?: {
    name?: string; artistName?: string; releaseDate?: string;
    artwork?: { url?: string }; trackCount?: number;
  };
}

const bare = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * An artist's albums from the Apple Music catalog.
 *
 * The artist page is built on the public iTunes Search API, which is
 * unauthenticated and throttled per IP — on shared serverless egress that means
 * intermittent empty answers, and an empty answer renders as "no releases". This
 * is the same catalogue behind a developer token, so it isn't subject to that,
 * and it serves as the second opinion when iTunes comes back with nothing.
 *
 * Returns [] rather than throwing when unconfigured, so callers can treat it as
 * one source among several.
 */
export async function appleArtistAlbums(name: string): Promise<AppleArtistRelease[]> {
  const token = developerToken();
  if (!token) return [];
  const auth = { Authorization: `Bearer ${token}` };

  try {
    const found = await fetch(
      `https://api.music.apple.com/v1/catalog/us/search?types=artists&limit=10&term=${encodeURIComponent(name)}`,
      { headers: auth, cache: "no-store" }
    );
    if (!found.ok) return [];
    const artists: AMArtist[] = (await found.json())?.results?.artists?.data ?? [];
    if (artists.length === 0) return [];

    // Prefer an exact name match; Apple orders by relevance, so the first hit is
    // the well-known holder of a shared name when there's no exact one.
    const want = bare(name);
    const artist = artists.find((a) => a.attributes?.name && bare(a.attributes.name) === want) ?? artists[0];

    const albums = await fetch(
      `https://api.music.apple.com/v1/catalog/us/artists/${artist.id}/albums?limit=100`,
      { headers: auth, cache: "no-store" }
    );
    if (!albums.ok) return [];
    const data: AMFullAlbum[] = (await albums.json())?.data ?? [];

    return data
      .filter((a) => a.attributes?.name && a.attributes?.artistName && a.attributes?.artwork?.url)
      .map((a) => ({
        // Apple's ids are numeric strings; the artist page keys releases by number.
        collectionId: Number(a.id),
        collectionName: a.attributes!.name as string,
        artistName: a.attributes!.artistName as string,
        // The artwork URL is a template — fill it in at the size the page wants.
        artworkUrl100: (a.attributes!.artwork!.url as string).replace("{w}", "600").replace("{h}", "600"),
        releaseDate: a.attributes!.releaseDate ?? "",
        trackCount: a.attributes!.trackCount,
        artistId: Number(artist.id),
      }))
      .filter((a) => Number.isFinite(a.collectionId));
  } catch {
    return [];
  }
}
