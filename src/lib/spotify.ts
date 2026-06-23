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

export async function getAlbum(id: string): Promise<SpotifyAlbum | null> {
  const t = await token();
  const r = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
    headers: { Authorization: `Bearer ${t}` },
    next: { revalidate: 86400 },
  });
  if (!r.ok) return null;
  return r.json();
}
