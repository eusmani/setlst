// SETLST Clubs — a weekly, rotating featured album in each of four categories.
// Everyone gets the same picks for a given week, so the community reviews and
// discusses the same records together. Picks rotate deterministically by week,
// giving people a reason to come back every week.

export interface ClubCategory {
  key: "classic" | "overlooked" | "new" | "throwback";
  label: string;
  blurb: string;
}

export interface ClubPick {
  category: ClubCategory["key"];
  label: string;
  blurb: string;
  spotifyId: string; // iTunes collectionId — album pages resolve these
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

export const CLUB_CATEGORIES: ClubCategory[] = [
  { key: "classic", label: "Classic Club", blurb: "A universally-loved landmark worth revisiting." },
  { key: "overlooked", label: "Overlooked Club", blurb: "A cult favorite that deserves more ears." },
  { key: "new", label: "New Release Club", blurb: "Something fresh out this week." },
  { key: "throwback", label: "Throwback Club", blurb: "A nostalgic pick to take you back." },
];

// Curated pools (title + artist). One is chosen per week by rotating index.
const CLASSICS: [string, string][] = [
  ["The Dark Side of the Moon", "Pink Floyd"], ["Rumours", "Fleetwood Mac"],
  ["To Pimp a Butterfly", "Kendrick Lamar"], ["OK Computer", "Radiohead"],
  ["Illmatic", "Nas"], ["Blonde", "Frank Ocean"], ["Abbey Road", "The Beatles"],
  ["Blue", "Joni Mitchell"], ["Nevermind", "Nirvana"], ["Purple Rain", "Prince"],
  ["Songs in the Key of Life", "Stevie Wonder"], ["The Miseducation of Lauryn Hill", "Lauryn Hill"],
  ["Kid A", "Radiohead"], ["My Beautiful Dark Twisted Fantasy", "Kanye West"],
  ["Pet Sounds", "The Beach Boys"], ["Good Kid, M.A.A.D City", "Kendrick Lamar"],
];

const OVERLOOKED: [string, string][] = [
  ["Dummy", "Portishead"], ["Song Cycle", "Van Dyke Parks"], ["Bug", "Dinosaur Jr."],
  ["Vespertine", "Björk"], ["Spiderland", "Slint"], ["Have One on Me", "Joanna Newsom"],
  ["Black Up", "Shabazz Palaces"], ["The Glow Pt. 2", "The Microphones"],
  ["Since I Left You", "The Avalanches"], ["Cassadaga", "Bright Eyes"],
  ["Rejoicing in the Hands", "Devendra Banhart"], ["Fear Fun", "Father John Misty"],
  ["Ege Bamyasi", "Can"], ["A Sailboat in the Moonlight", "Duster"],
  ["Twin Fantasy", "Car Seat Headrest"], ["Bark Your Head Off, Dog", "Hop Along"],
];

const THROWBACKS: [string, string][] = [
  ["American Idiot", "Green Day"], ["Is This It", "The Strokes"],
  ["Whatever People Say I Am, That's What I'm Not", "Arctic Monkeys"],
  ["Funeral", "Arcade Fire"], ["Hybrid Theory", "Linkin Park"],
  ["Stankonia", "OutKast"], ["The Marshall Mathers LP", "Eminem"],
  ["Elephant", "The White Stripes"], ["Demon Days", "Gorillaz"],
  ["Back to Black", "Amy Winehouse"], ["Take Care", "Drake"],
  ["Channel Orange", "Frank Ocean"], ["Currents", "Tame Impala"],
  ["21", "Adele"], ["Nothing Was the Same", "Drake"], ["good kid, m.A.A.d city", "Kendrick Lamar"],
];

// ISO-ish week counter — stable within a week, increments every Monday.
export function weekIndex(d = new Date()): number {
  return Math.floor((d.getTime() / 86400000 + 4) / 7);
}

interface ItunesResult {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
}

// Resolve a curated (title, artist) into a real iTunes album with cover + id.
async function resolveAlbum(title: string, artist: string): Promise<Omit<ClubPick, "category" | "label" | "blurb"> | null> {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=5`,
      { next: { revalidate: 86400 } }
    );
    if (!r.ok) return null;
    const results: ItunesResult[] = (await r.json()).results ?? [];
    const want = title.toLowerCase();
    const hit =
      results.find((a) => (a.collectionName ?? "").toLowerCase().includes(want)) ?? results[0];
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

// The freshest release for the New Release Club — pulled from the iTunes Top
// Albums chart, rotated by week so it changes but stays current.
async function newReleasePick(wk: number): Promise<Omit<ClubPick, "category" | "label" | "blurb"> | null> {
  try {
    const r = await fetch("https://itunes.apple.com/us/rss/topalbums/limit=25/json", { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    interface Entry { "im:name"?: { label?: string }; "im:artist"?: { label?: string }; "im:image"?: { label?: string }[]; "im:releaseDate"?: { attributes?: { label?: string } }; id?: { attributes?: { "im:id"?: string } } }
    const entries: Entry[] = (await r.json()).feed?.entry ?? [];
    const NINETY_DAYS = 90 * 86400000;
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
    // Prefer genuinely-new releases (last 90 days); fall back to the chart if none.
    const recent = all.filter((a) => a.releasedAt && now - a.releasedAt < NINETY_DAYS);
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

// This week's four club picks (resolved with real album metadata).
export async function getWeeklyClubs(): Promise<ClubPick[]> {
  const wk = weekIndex();
  const [classic] = [fromPool(CLASSICS, wk)];
  const overlooked = fromPool(OVERLOOKED, wk);
  const throwback = fromPool(THROWBACKS, wk);

  const [c, o, n, t] = await Promise.all([
    resolveAlbum(classic[0], classic[1]),
    resolveAlbum(overlooked[0], overlooked[1]),
    newReleasePick(wk),
    resolveAlbum(throwback[0], throwback[1]),
  ]);

  const meta = (key: ClubCategory["key"]) => CLUB_CATEGORIES.find((x) => x.key === key)!;
  const picks: ClubPick[] = [];
  const add = (key: ClubCategory["key"], a: Omit<ClubPick, "category" | "label" | "blurb"> | null) => {
    if (a) picks.push({ category: key, label: meta(key).label, blurb: meta(key).blurb, ...a });
  };
  add("classic", c);
  add("overlooked", o);
  add("new", n);
  add("throwback", t);
  return picks;
}
