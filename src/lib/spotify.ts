let cache: { token: string; exp: number } | null = null;

async function token() {
  if (cache && Date.now() < cache.exp) return cache.token;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify not configured");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const d = await res.json();
  cache = { token: d.access_token, exp: Date.now() + (d.expires_in - 60) * 1000 };
  return cache.token;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  genres?: string[];
  total_tracks: number;
  album_type?: string;
  tracks?: { items: { name: string; duration_ms: number; track_number: number; preview_url: string | null; external_urls: { spotify: string } }[] };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: { url: string }[];
  popularity?: number;
  followers?: { total: number };
  genres?: string[];
}

// One Spotify search call for a single result type. Spotify caps `limit` at 10
// (higher values 400 with "Invalid limit"), and multi-type searches
// (`type=album,artist`) also error — so callers query one type at a time, ≤10.
async function searchOne(q: string, type: "album" | "artist", limit: number, offset = 0) {
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({ q, type, limit: String(limit), offset: String(offset), market: "US" })}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token();
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` }, next: { revalidate: 3600 } });
    if (r.status === 429) {
      // Spotify's client-credentials quota is finite and, once exhausted,
      // Retry-After comes back in hours — far longer than we can wait here.
      // Log it: this used to return null silently, which surfaced to users as
      // "no results" and was indistinguishable from a genuinely empty search.
      const retryAfter = parseInt(r.headers.get("Retry-After") ?? "1");
      console.error(`[spotify] rate limited (429), retry-after ${retryAfter}s`);
      if (retryAfter > 5) return null;
      await new Promise((res) => setTimeout(res, Math.min(retryAfter * 1000, 2000)));
      continue;
    }
    const d = await r.json();
    if (d.error) { console.error("[spotify] search error:", d.error); return null; }
    return d;
  }
  return null;
}

// Matching artists (with `popularity` 0–100) and albums for the search bar —
// runs the artist and album searches in parallel.
export async function searchArtistsAndAlbums(q: string): Promise<{ artists: SpotifyArtist[]; albums: SpotifyAlbum[] }> {
  const [artistRes, albumRes] = await Promise.all([
    searchOne(q, "artist", 10),
    searchOne(q, "album", 10),
  ]);
  return {
    artists: artistRes?.artists?.items ?? [],
    albums: albumRes?.albums?.items ?? [],
  };
}

export async function searchAlbums(q: string): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({ q, type: "album", limit: "5" });
  const url = `https://api.spotify.com/v1/search?${params}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await token();
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${t}` },
      // Cache deterministic queries so repeat calls don't re-hit Spotify (avoids rate limiting)
      next: { revalidate: 86400 },
    });
    if (r.status === 429) {
      const retry = Math.min(parseInt(r.headers.get("Retry-After") ?? "1") * 1000, 2000);
      await new Promise((res) => setTimeout(res, retry));
      continue;
    }
    const d = await r.json();
    if (d.error) { console.error("[spotify] search error:", d.error); return []; }
    return d.albums?.items ?? [];
  }
  return [];
}

// Popular albums released in a given year (e.g. "1994") or year range (e.g.
// "1990-1999" for a whole decade), ordered by Spotify's relevance ranking —
// which surfaces the era's big records first. Paginated via `page`: Spotify caps
// search `limit` at 10, so each page is one API call at offset page*10. Callers
// treat a full page of 10 as "there may be more".
const YEAR_NOISE = /karaoke|tribute|\bcover(s)?\b|greatest hits|the best of|\bbest of\b|playlist|workout|lullab|8-?bit|instrumental versions?|rain sounds?|white noise|\bnoise\b|sleep|meditation|\basmr\b|nature sounds?|ocean sounds?|\d+\s*hours?\b|hours of|study music|focus music|ambient noise|live remix|deep sleep|relaxing/i;

export async function popularAlbumsByYear(spec: string, page = 0): Promise<SpotifyAlbum[]> {
  const d = await searchOne(`year:${spec}`, "album", 10, Math.max(0, page) * 10);
  const items: SpotifyAlbum[] = d?.albums?.items ?? [];
  // Filter obvious non-canonical noise; keep real studio releases.
  return items.filter((a) => a?.id && a?.name && !YEAR_NOISE.test(a.name));
}

export interface RecentAlbum { spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null; releaseDate: string | null; spotifyUrl: string; popularity: number }

// Recent new albums from Spotify (client-credentials, search `tag:new` ≈ last 2
// weeks). sort="popularity" surfaces the biggest/mainstream new drops; sort="date"
// surfaces the very newest.
export async function recentPopularAlbums(limit = 20, sort: "popularity" | "date" = "date"): Promise<RecentAlbum[]> {
  try {
    const t = await token();
    // Spotify caps search limit at 10, so page through offsets to gather ~40.
    const pages = await Promise.all(
      [0, 10, 20, 30].map((offset) =>
        fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent("tag:new")}&type=album&limit=10&offset=${offset}&market=US`,
          { headers: { Authorization: `Bearer ${t}` }, next: { revalidate: 3600 } }
        ).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      )
    );
    const items: SpotifyAlbum[] = pages.flatMap((p) => p?.albums?.items ?? []);
    const ids = [...new Set(items.map((a) => a.id))].slice(0, 20);
    if (ids.length === 0) return [];

    // Batch-fetch album details to get popularity (0–100) for ranking.
    const det = await fetch(`https://api.spotify.com/v1/albums?ids=${ids.join(",")}&market=US`, {
      headers: { Authorization: `Bearer ${t}` }, next: { revalidate: 3600 },
    });
    interface Full { id: string; name: string; popularity?: number; images?: { url: string }[]; release_date?: string; artists?: { name: string }[]; album_type?: string; external_urls?: { spotify?: string } }
    const full: Full[] = det.ok ? ((await det.json()).albums ?? []) : [];

    return full
      .filter((a) => a && a.album_type === "album") // real albums, not singles
      .sort((a, b) =>
        sort === "popularity"
          ? (b.popularity ?? 0) - (a.popularity ?? 0) || (b.release_date ?? "").localeCompare(a.release_date ?? "")
          : (b.release_date ?? "").localeCompare(a.release_date ?? "") || (b.popularity ?? 0) - (a.popularity ?? 0)
      )
      .slice(0, limit)
      .map((a) => ({
        spotifyId: a.id,
        title: a.name,
        artist: a.artists?.[0]?.name ?? "",
        artwork: a.images?.[0]?.url ?? null,
        year: a.release_date ? parseInt(a.release_date) : null,
        releaseDate: a.release_date ?? null,
        spotifyUrl: a.external_urls?.spotify ?? `https://open.spotify.com/album/${a.id}`,
        popularity: a.popularity ?? 0,
      }));
  } catch {
    return [];
  }
}

// Resolve the canonical cover art for a KNOWN album (exact title + artist) from
// the real Spotify catalog. Uses a structured `album:… artist:…` query and then
// verifies BOTH the artist and the title, so we never fall back to a same-named
// album by another artist, a remix/B-sides EP, or a tribute — the exact failure
// modes of loose text search (and of the iTunes-backed /spotify/search route,
// whose catalog is missing many of these albums entirely).
export async function resolveAlbumCover(title: string, artist: string): Promise<string | null> {
  const best = await findAlbum(title, artist);
  return best?.images?.[0]?.url ?? null;
}

// Shared by every "find this album on Spotify by name" flow. Returns the single
// best search hit, or null when nothing clears the artist/title bar.
async function findAlbum(title: string, artist: string): Promise<SpotifyAlbum | null> {
  const items = await searchAlbums(`album:${title} artist:${artist}`);
  if (!items.length) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const wantTitle = norm(title);
  const wantArtist = norm(artist);
  // Words marking a non-canonical edition. Only penalized when the target title
  // itself doesn't include them (so an actual "… Remixes" anniversary still works).
  const VARIANT = /\b(remix|remixes|b sides?|deluxe|instrumental|live|karaoke|reissue|edition|version|demos?|commentary)\b/;
  const titleWantsVariant = VARIANT.test(wantTitle);

  const score = (a: SpotifyAlbum): number => {
    const an = norm(a.name);
    const ar = norm(a.artists?.[0]?.name ?? "");
    // Artist must match, else it's a different album that merely shares a title.
    let s: number;
    if (ar === wantArtist) s = 100;
    else if (ar.includes(wantArtist) || wantArtist.includes(ar)) s = 60;
    else return -1;
    // Title match tiers: prefer an exact title over a superset ("Currents" beats
    // "Currents B-Sides & Remixes").
    if (an === wantTitle) s += 50;
    else if (an.startsWith(wantTitle)) s += 30;
    else if (an.includes(wantTitle)) s += 15;
    else return -1; // title unrelated — reject
    if (!titleWantsVariant && VARIANT.test(an)) s -= 40;
    return s;
  };

  const best = items
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s >= 0)
    .sort((x, y) => y.s - x.s)[0];
  return best?.a ?? null;
}

// Every track of an album, found by name — for tracklists sourced from iTunes,
// which carry no Spotify IDs of their own. Two calls (search, then the album, as
// search results don't include tracks); callers cache the result. Resolves to an
// empty list on any failure so a missing album or unconfigured credentials just
// leaves the caller's existing links alone.
export async function resolveAlbumTracks(
  title: string,
  artist: string,
): Promise<{ name: string; url: string }[]> {
  try {
    const match = await findAlbum(title, artist);
    if (!match) return [];
    const full = await getAlbum(match.id);
    return (full?.tracks?.items ?? [])
      .map((t) => ({ name: t.name, url: t.external_urls?.spotify }))
      .filter((t): t is { name: string; url: string } => !!t.name && !!t.url);
  } catch {
    return [];
  }
}

export async function getAlbum(id: string): Promise<SpotifyAlbum | null> {
  const t = await token();
  const r = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
    headers: { Authorization: `Bearer ${t}` },
    next: { revalidate: 86400 },
  });
  if (!r.ok) return null;
  return r.json();
}

// ---------------------------------------------------------------------------
// Fallback catalogue
// ---------------------------------------------------------------------------

/**
 * Album search via the iTunes Search API, shaped like a Spotify response.
 *
 * Spotify's client-credentials quota is finite and, when it runs out, comes back
 * 429 with a Retry-After measured in hours — which took search down completely.
 * iTunes needs no auth and is already used elsewhere in this codebase, so it
 * makes a good second source rather than leaving the app with a dead search bar.
 *
 * Ids are iTunes collection ids, not Spotify ids. That's fine: album links carry
 * title/artist/artwork as query params and the album page falls back to them
 * when an id can't be resolved.
 */
/**
 * Artist search against the iTunes catalogue.
 *
 * Used when Spotify gives us no artists. The catalogue's own ordering is by
 * relevance and sales, so the well-known act leads: "earl" returns Earl
 * Sweatshirt first, ahead of the several obscure acts named exactly "Earl".
 * Inferring artists from album results can't do that — it only ever sees
 * whoever happened to chart for that word.
 *
 * No artwork comes back from this endpoint; callers pair it with a cover from
 * the album results.
 */
export async function searchArtistsViaITunes(q: string, limit = 12): Promise<{ id: string; name: string }[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=${limit}`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const d = await r.json();
    const rows: Record<string, unknown>[] = Array.isArray(d?.results) ? d.results : [];
    // De-duplicate by name, keeping the first — which, given the catalogue's
    // ordering, is the best-known holder of it. iTunes returns a separate record
    // per artist page, so a common name like "Earl" comes back five or six times
    // with different ids, and our artist pages are keyed by name: every one of
    // those rows opens the identical page. They are duplicates here whatever
    // they are at Apple.
    const seen = new Set<string>();
    return rows
      .filter((row) => row.artistId && row.artistName)
      .map((row) => ({ id: String(row.artistId), name: String(row.artistName) }))
      .filter((a) => {
        const key = a.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export async function searchAlbumsViaITunes(q: string, limit = 20): Promise<SpotifyAlbum[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=${limit}`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const d = await r.json();
    const rows: Record<string, unknown>[] = Array.isArray(d?.results) ? d.results : [];

    return rows
      .filter((row) => row.collectionId && row.collectionName && row.artistName)
      .map((row) => ({
        id: String(row.collectionId),
        name: String(row.collectionName),
        artists: [{ name: String(row.artistName) }],
        // artworkUrl100 is a 100px thumb; the same URL serves larger sizes.
        images: row.artworkUrl100
          ? [{ url: String(row.artworkUrl100).replace("100x100", "600x600") }]
          : [],
        release_date: row.releaseDate ? String(row.releaseDate).slice(0, 10) : "",
        total_tracks: Number(row.trackCount ?? 0),
        album_type: "album",
      }));
  } catch {
    return [];
  }
}
