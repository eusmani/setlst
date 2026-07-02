// GRAILS — four weekly featured albums, one per category. Categories are defined
// by release era + popularity, and the weekly pick is REVIEW-AWARE: it favors the
// album the SETLST community is actually reviewing in that bucket, falling back to
// a curated seed when nobody's reviewed a fitting record yet.
//
//   Classics       → released before 1990.
//   Overlooked Hits → cult / lower-streamed records that fly under the radar.
//   Recents        → out recently and getting buzz.
//   Throwbacks     → hugely popular in the past, faded since.

import { prisma } from "./prisma";

export interface ClubCategory {
  key: "classic" | "overlooked" | "new" | "throwback";
  label: string;
  blurb: string;
}

export interface ClubPick {
  category: ClubCategory["key"];
  label: string;
  blurb: string;
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

export const CLUB_CATEGORIES: ClubCategory[] = [
  { key: "classic", label: "Classics", blurb: "A landmark from before 1990." },
  { key: "overlooked", label: "Overlooked Hits", blurb: "A cult favorite that flies under the radar." },
  { key: "new", label: "Recents", blurb: "A buzzy new release." },
  { key: "throwback", label: "Throwbacks", blurb: "A former favorite worth revisiting." },
];

// Curated seeds — used when the community hasn't reviewed a fitting album yet.
// CLASSICS are strictly pre-1990.
const CLASSICS: [string, string][] = [
  ["The Dark Side of the Moon", "Pink Floyd"], ["Rumours", "Fleetwood Mac"],
  ["Abbey Road", "The Beatles"], ["Blue", "Joni Mitchell"], ["Pet Sounds", "The Beach Boys"],
  ["Purple Rain", "Prince"], ["Songs in the Key of Life", "Stevie Wonder"],
  ["Thriller", "Michael Jackson"], ["Kind of Blue", "Miles Davis"],
  ["London Calling", "The Clash"], ["Born to Run", "Bruce Springsteen"],
  ["What's Going On", "Marvin Gaye"], ["The Velvet Underground & Nico", "The Velvet Underground"],
  ["Exile on Main St.", "The Rolling Stones"], ["Remain in Light", "Talking Heads"],
  ["Off the Wall", "Michael Jackson"],
];

// Cult / lower-streamed records.
const OVERLOOKED: [string, string][] = [
  ["Dummy", "Portishead"], ["Song Cycle", "Van Dyke Parks"], ["Bug", "Dinosaur Jr."],
  ["Vespertine", "Björk"], ["Spiderland", "Slint"], ["Have One on Me", "Joanna Newsom"],
  ["Black Up", "Shabazz Palaces"], ["The Glow Pt. 2", "The Microphones"],
  ["Since I Left You", "The Avalanches"], ["Cassadaga", "Bright Eyes"],
  ["Rejoicing in the Hands", "Devendra Banhart"], ["Fear Fun", "Father John Misty"],
  ["Ege Bamyasi", "Can"], ["Stratosphere", "Duster"],
  ["Twin Fantasy", "Car Seat Headrest"], ["Bark Your Head Off, Dog", "Hop Along"],
];

// Formerly huge, faded since (roughly 1990–the last few years).
const THROWBACKS: [string, string][] = [
  ["OK Computer", "Radiohead"], ["Nevermind", "Nirvana"], ["Illmatic", "Nas"],
  ["The Miseducation of Lauryn Hill", "Lauryn Hill"], ["To Pimp a Butterfly", "Kendrick Lamar"],
  ["My Beautiful Dark Twisted Fantasy", "Kanye West"], ["good kid, m.A.A.d city", "Kendrick Lamar"],
  ["Is This It", "The Strokes"], ["American Idiot", "Green Day"], ["Funeral", "Arcade Fire"],
  ["Stankonia", "OutKast"], ["The Marshall Mathers LP", "Eminem"], ["Back to Black", "Amy Winehouse"],
  ["Take Care", "Drake"], ["Channel Orange", "Frank Ocean"], ["Demon Days", "Gorillaz"],
  ["Hybrid Theory", "Linkin Park"], ["21", "Adele"],
];

// ISO-ish week counter — stable within a week, increments every Monday.
export function weekIndex(d = new Date()): number {
  return Math.floor((d.getTime() / 86400000 + 4) / 7);
}

type PickCore = Omit<ClubPick, "category" | "label" | "blurb">;

interface ItunesResult {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
}

// Resolve a (title, artist) into a real iTunes album with cover + id.
async function resolveAlbum(title: string, artist: string): Promise<PickCore | null> {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=5`,
      { next: { revalidate: 86400 } }
    );
    if (!r.ok) return null;
    const results: ItunesResult[] = (await r.json()).results ?? [];
    const want = title.toLowerCase();
    const hit = results.find((a) => (a.collectionName ?? "").toLowerCase().includes(want)) ?? results[0];
    if (!hit?.collectionId || !hit.collectionName || !hit.artistName) return null;
    return {
      spotifyId: String(hit.collectionId),
      title: hit.collectionName,
      artist: hit.artistName,
      artwork: (hit.artworkUrl100 ?? "").replace("100x100bb", "600x600bb") || null,
      year: hit.releaseDate ? new Date(hit.releaseDate).getFullYear() : null,
    };
  } catch {
    return null;
  }
}

// Genuinely-new, buzzy release from the iTunes Top Albums chart (last 90 days).
async function newReleasePick(wk: number): Promise<PickCore | null> {
  try {
    const r = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=25/json", { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    interface Entry { "im:name"?: { label?: string }; "im:artist"?: { label?: string }; "im:image"?: { label?: string }[]; "im:releaseDate"?: { attributes?: { label?: string } }; id?: { attributes?: { "im:id"?: string } } }
    const entries: Entry[] = (await r.json()).feed?.entry ?? [];
    const now = Date.now();
    const all = entries
      .map((e) => {
        const rd = e["im:releaseDate"]?.attributes?.label;
        return {
          spotifyId: e.id?.attributes?.["im:id"] ?? "",
          title: e["im:name"]?.label ?? "",
          artist: e["im:artist"]?.label ?? "",
          artwork: (e["im:image"]?.slice(-1)[0]?.label ?? "").replace("170x170bb", "600x600bb") || null,
          releasedAt: rd ? new Date(rd).getTime() : 0,
          year: rd ? new Date(rd).getFullYear() : null,
        };
      })
      .filter((a) => a.spotifyId && a.title && a.artist && a.artwork);
    const recent = all.filter((a) => a.releasedAt && now - a.releasedAt < 90 * 86400000);
    const pool = recent.length ? recent : all;
    if (pool.length === 0) return null;
    const p = pool[wk % Math.min(pool.length, 10)];
    return { spotifyId: p.spotifyId, title: p.title, artist: p.artist, artwork: p.artwork, year: p.year };
  } catch {
    return null;
  }
}

function fromPool(pool: [string, string][], wk: number): [string, string] {
  return pool[wk % pool.length];
}

interface ReviewedAlbum { spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null; count: number }

// Albums the community is reviewing on SETLST, with review counts + year.
async function communityReviewed(): Promise<ReviewedAlbum[]> {
  try {
    const albums = await prisma.album.findMany({
      where: { reviews: { some: {} } },
      select: { spotifyId: true, title: true, artist: true, artwork: true, year: true, _count: { select: { reviews: true } } },
    });
    return albums.map((a) => ({ spotifyId: a.spotifyId, title: a.title, artist: a.artist, artwork: a.artwork, year: a.year, count: a._count.reviews }));
  } catch {
    return [];
  }
}

// Turn a community album into a pick, resolving artwork from iTunes if missing.
async function fromReviewed(a: ReviewedAlbum): Promise<PickCore> {
  let artwork = a.artwork;
  if (!artwork) artwork = (await resolveAlbum(a.title, a.artist))?.artwork ?? null;
  return { spotifyId: a.spotifyId, title: a.title, artist: a.artist, artwork, year: a.year };
}

// This week's four grails — review-aware, with curated fallbacks.
export async function getWeeklyClubs(): Promise<ClubPick[]> {
  const wk = weekIndex();
  const thisYear = new Date().getFullYear();
  const reviewed = await communityReviewed();

  // Most-reviewed community album fitting each bucket (the algorithm "changes
  // based on reviews" — the pick follows what people are actually reviewing).
  const topIn = (pred: (a: ReviewedAlbum) => boolean) =>
    reviewed.filter((a) => a.year != null && a.count > 0 && pred(a)).sort((x, y) => y.count - x.count)[0];

  const classicR = topIn((a) => a.year! < 1990);
  const throwbackR = topIn((a) => a.year! >= 1990 && a.year! <= thisYear - 6);
  const recentR = topIn((a) => a.year! >= thisYear - 1); // recent + community buzz

  const [classic, overlooked, recent, throwback] = await Promise.all([
    classicR ? fromReviewed(classicR) : (async () => { const [t, ar] = fromPool(CLASSICS, wk); return resolveAlbum(t, ar); })(),
    (async () => { const [t, ar] = fromPool(OVERLOOKED, wk); return resolveAlbum(t, ar); })(),
    recentR ? fromReviewed(recentR) : newReleasePick(wk),
    throwbackR ? fromReviewed(throwbackR) : (async () => { const [t, ar] = fromPool(THROWBACKS, wk); return resolveAlbum(t, ar); })(),
  ]);

  const meta = (key: ClubCategory["key"]) => CLUB_CATEGORIES.find((x) => x.key === key)!;
  const picks: ClubPick[] = [];
  const add = (key: ClubCategory["key"], a: PickCore | null) => {
    if (a) picks.push({ category: key, label: meta(key).label, blurb: meta(key).blurb, ...a });
  };
  add("classic", classic);
  add("overlooked", overlooked);
  add("new", recent);
  add("throwback", throwback);
  return picks;
}
