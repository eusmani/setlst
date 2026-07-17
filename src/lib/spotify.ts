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
  tracks?: { items: { name: string; duration_ms: number; track_number: number; preview_url: string | null; external_urls: { spotify: string } }[] };
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

export interface RecentAlbum { spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null; releaseDate: string | null; spotifyUrl: string; popularity: number }

// Recent new albums from Spotify (client-credentials, search `tag:new` ≈ last 2
// weeks). sort="popularity" surfaces the biggest/mainstream new drops; sort="date"
// surfaces the very newest.
export async function recentPopularAlbums(limit = 20, sort: "popularity" | "date" = "date"): Promise<RecentAlbum[]> {
  try {
    const t = await token();
    const search = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent("tag:new")}&type=album&limit=40&market=US`,
      { headers: { Authorization: `Bearer ${t}` }, next: { revalidate: 3600 } }
    );
    if (!search.ok) return [];
    const items: SpotifyAlbum[] = (await search.json()).albums?.items ?? [];
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
  return best?.a.images?.[0]?.url ?? null;
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
