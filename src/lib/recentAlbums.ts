// Recently viewed albums, kept per-device in localStorage.
//
// There is no view tracking in the database, and adding it would mean a write
// on every album open just to power one strip on /search. Keeping the list on
// the client avoids that entirely and has the side benefit of working while
// signed out.

export interface RecentAlbum {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  viewedAt: number;
}

const KEY = "setlst:recent-albums";
const MAX = 12;

function isRecentAlbum(v: unknown): v is RecentAlbum {
  if (!v || typeof v !== "object") return false;
  const a = v as Partial<RecentAlbum>;
  return typeof a.spotifyId === "string" && typeof a.title === "string"
    && typeof a.artist === "string" && typeof a.viewedAt === "number";
}

export function readRecentAlbums(): RecentAlbum[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecentAlbum)
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX);
  } catch {
    // Corrupt JSON, or storage blocked in private mode — an empty history is
    // always a safe answer here.
    return [];
  }
}

export function recordRecentAlbum(album: Omit<RecentAlbum, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    // Re-opening an album moves it to the front rather than duplicating it.
    const next = [
      { ...album, viewedAt: Date.now() },
      ...readRecentAlbums().filter((a) => a.spotifyId !== album.spotifyId),
    ].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    // `storage` only fires in *other* tabs, so tell this one directly.
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Quota exceeded or storage unavailable. Recording history is never worth
    // breaking the album page over.
  }
}

// ---- External-store bindings for useSyncExternalStore ----
//
// Reading localStorage during render isn't allowed, and reading it in an effect
// means a setState that cascades an extra render. useSyncExternalStore is the
// supported way to subscribe to something outside React, so the parsing lives
// here behind a cache: getSnapshot must return a referentially stable value or
// React re-renders forever.

const CHANGED = "setlst:recent-albums-changed";
const EMPTY: RecentAlbum[] = [];

let cachedRaw: string | null = null;
let cachedParsed: RecentAlbum[] = EMPTY;

export function subscribeRecentAlbums(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function getRecentAlbumsSnapshot(): RecentAlbum[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // Same underlying string as last time — hand back the same array instance.
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = readRecentAlbums();
  return cachedParsed;
}

// The server has no history to report, and this instance must stay stable.
export function getRecentAlbumsServerSnapshot(): RecentAlbum[] {
  return EMPTY;
}
