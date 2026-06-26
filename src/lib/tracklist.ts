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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getTracklist(title: string, artist: string): Promise<TrackItem[]> {
  try {
    const term = encodeURIComponent(`${artist} ${title}`);

    // 1. Album-entity search → collectionId.
    let collectionId: number | undefined;
    const sRes = await fetch(
      `https://itunes.apple.com/search?term=${term}&entity=album&limit=5`,
      { next: { revalidate: 604800 } }
    );
    if (sRes.ok) {
      const sData = await sRes.json();
      const want = norm(title);
      const albums = sData.results ?? [];
      collectionId =
        albums.find((a: { collectionName?: string }) => norm(a.collectionName ?? "") === want)?.collectionId ??
        albums[0]?.collectionId;
    }

    // 2. Fallback: some albums (odd punctuation, obscure releases) don't surface in the
    // album search but their songs do — recover the collectionId from a song search.
    if (!collectionId) {
      const songRes = await fetch(
        `https://itunes.apple.com/search?term=${term}&entity=song&limit=25`,
        { next: { revalidate: 604800 } }
      );
      if (songRes.ok) {
        const songData = await songRes.json();
        const want = norm(title);
        const wantArtist = norm(artist).slice(0, 8);
        const songs: { collectionId?: number; collectionName?: string; artistName?: string }[] = songData.results ?? [];
        const match = songs.find(
          (r) => r.collectionId && norm(r.collectionName ?? "").includes(want) && norm(r.artistName ?? "").includes(wantArtist)
        );
        collectionId = match?.collectionId ?? songs[0]?.collectionId;
      }
    }

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
