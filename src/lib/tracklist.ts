// Tracklist + 30s preview snippets from the iTunes Search API (free, works server-side),
// with each track linked to Spotify via a search URL.
export interface TrackItem {
  name: string;
  artist: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

// Aggregate every performing artist across a tracklist (primary + collaborators + features).
export function collectContributors(
  tracks: { name: string; artist?: string }[],
  primaryArtist: string
): string[] {
  const set = new Map<string, string>(); // lowercase -> display
  const add = (name: string) => {
    const v = name.trim();
    if (v && v.length < 60) set.set(v.toLowerCase(), v);
  };
  primaryArtist.split(/,|&|\band\b/).forEach(add);
  for (const t of tracks) {
    (t.artist ?? "").split(/,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b/i).forEach(add);
    const m = t.name.match(/\((?:feat\.?|ft\.?|with)\s([^)]+)\)/i);
    if (m) m[1].split(/,|&|\band\b/).forEach(add);
  }
  return [...set.values()];
}

function spotifySearch(track: string, artist: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${track} ${artist}`)}`;
}

export async function getTracklist(title: string, artist: string): Promise<TrackItem[]> {
  try {
    // 1. Find the album to get its iTunes collectionId
    const searchUrl =
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}` +
      `&entity=album&limit=1`;
    const sRes = await fetch(searchUrl, { next: { revalidate: 604800 } });
    if (!sRes.ok) return [];
    const sData = await sRes.json();
    const collectionId = sData.results?.[0]?.collectionId;
    if (!collectionId) return [];

    // 2. Look up all songs in that album, in order
    const lookupUrl = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=200`;
    const lRes = await fetch(lookupUrl, { next: { revalidate: 604800 } });
    if (!lRes.ok) return [];
    const lData = await lRes.json();

    const songs = (lData.results ?? []).filter(
      (r: { wrapperType?: string; kind?: string }) => r.wrapperType === "track" && r.kind === "song"
    );

    return songs
      .map((t: {
        trackName: string;
        artistName?: string;
        trackNumber?: number;
        trackTimeMillis?: number;
        previewUrl?: string;
      }) => ({
        name: t.trackName,
        artist: t.artistName ?? artist,
        duration_ms: t.trackTimeMillis ?? 0,
        track_number: t.trackNumber ?? 0,
        preview_url: t.previewUrl ?? null,
        external_urls: { spotify: spotifySearch(t.trackName, artist) },
      }))
      .sort((a: TrackItem, b: TrackItem) => a.track_number - b.track_number);
  } catch {
    return [];
  }
}
