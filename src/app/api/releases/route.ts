import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";

// An artist is either a name (search) or {name, id} pinned to a specific iTunes artist
type Artist = string | { name: string; id: number };

// UNDERGROUND / non-mainstream roster — the online and acclaimed corners of rap,
// alternative & shoegaze, metal/hardcore, and hyperpop. Intentionally excludes
// chart-pop and the biggest mainstream names so the radar surfaces deeper cuts.
const POPULAR_UNDERGROUND: Artist[] = [
  // hyperpop / digicore / glitchcore
  "fakemink", "underscores", "Jane Remover", "ericdoa", "glaive", "midwxst",
  "aldn", "brakence", "quannnic", "Wisp", "d0llywood1", "p4rkr", "osquinn",
  "twikipedia", "8485", "Frost Children", "food house", "Gupi", "fraxiom",
  "umru", "Dorian Electra", "Hannah Diamond", "A. G. Cook", "100 gecs",
  "Black Dresses", "Machine Girl", "GFOTY", "EASYFUN", "Alice Gas",
  "blackwinterwells", "kmoe", "Sematary",
  // drain gang / sad boys
  "Bladee", "Ecco2k", "Thaiboy Digital", "Yung Lean", "Whitearmor",
  // online / underground rap
  "Nettspend", "xaviersobased", "2hollis", "redveil", "SoFaygo", "Ka$hdami",
  "TiaCorine", "Lazer Dim 700", "loveboatluciano", "1oneam",
  "Cash Cobain", "454", "BabyTron", "Yhapojj", "RXKNephew", "Quadeca", "Niontay",
  // acclaimed underground hip-hop
  "MIKE", "Earl Sweatshirt", "Navy Blue", "billy woods", "Mach-Hommy",
  "JPEGMAFIA", "Danny Brown", "Denzel Curry", "Westside Gunn",
  "Conway the Machine", "Benny the Butcher", "Boldy James", "Maxo",
  "Pink Siifu", "Wiki", "Your Old Droog", "Knxwledge",
  // alternative / indie rock + shoegaze
  "Parannoul", "Weatherday", "feeble little horse", "julie",
  "They Are Gutting a Body of Water", "Narrow Head", "Wednesday",
  "MJ Lenderman", "Alex G", "Hotline TNT", "Snail Mail", "Soccer Mommy",
  "DIIV", "Slowdive", "Crumb", "Geese", "Fleshwater", "Greet Death",
  "Knifeplay", "Glixen", "Cloakroom", "Militarie Gun", "Drug Church",
  "Fiddlehead", "Anxious", "One Step Closer",
  // metal / hardcore
  "Knocked Loose", "Code Orange", "Turnstile", "Scowl", "Jesus Piece",
  "Vein.fm", "Chat Pile", "Full of Hell", "Spiritbox", "Loathe",
  "SeeYouSpaceCowboy", "Blood Incantation", "Gatecreeper", "Undeath",
  "200 Stab Wounds", "The Armed", "Portrayal of Guilt",
];

// Radar roster — underground / non-mainstream artists only.
const ARTISTS: Artist[] = POPULAR_UNDERGROUND;

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
}

const BAD = /\b(karaoke|tribute|made famous|cover version|string quartet|instrumental|8-bit)\b/i;

// Exact artist match (case-insensitive) — but still allow releases the artist LEADS
// as a collaboration ("MIKE & Wiki", "Artist feat. X"). This rejects different
// artists whose name merely contains the query ("Geese" ≠ "Goofy Geese", "maxo" ≠ "Maxo Kream").
function artistMatches(albumArtist: string, query: string): boolean {
  const a = albumArtist.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (a === q) return true;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Artist leads a collaboration: "Artist & X", "Artist, X", "Artist feat./ft./x/with/and X".
  return new RegExp(`^${esc}(?:\\s*[&,]|\\s+(?:feat\\.?|ft\\.?|featuring|with|and|x)\\b)`).test(a);
}

async function recentForArtist(artist: Artist, cutoff: string): Promise<{ artist: string; album: ItunesAlbum }[]> {
  const name = typeof artist === "string" ? artist : artist.name;
  const url = typeof artist === "string"
    ? `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=album&limit=25`
    : `https://itunes.apple.com/lookup?id=${artist.id}&entity=album&limit=25`; // pinned artist
  try {
    const r = await fetch(url, { next: { revalidate: 21600 } });
    if (!r.ok) return [];
    const results: ItunesAlbum[] = (await r.json()).results ?? [];
    return results
      .filter((a) =>
        a.collectionId && a.collectionName && a.artistName && a.artworkUrl100 &&
        a.releaseDate && a.releaseDate.slice(0, 10) >= cutoff &&  // this month or upcoming
        !BAD.test(a.collectionName) &&
        !isLikelyAI(a.artistName, a.collectionName) &&
        // when searching by name, require an exact artist match; pinned IDs are already exact
        (typeof artist !== "string" || artistMatches(a.artistName as string, name))
      )
      .map((a) => ({ artist: name, album: a }));
  } catch {
    return [];
  }
}

function toRec(album: ItunesAlbum) {
  return {
    id: String(album.collectionId),
    title: album.collectionName as string,
    artist: album.artistName as string,
    artwork: (album.artworkUrl100 as string).replace("100x100bb", "600x600bb"),
    releaseDate: (album.releaseDate as string).slice(0, 10),
    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${album.collectionName} ${album.artistName}`)}`,
  };
}

export async function GET(req: NextRequest) {
  const todayStr = new Date().toISOString().slice(0, 10);
  // ?range=week   → only releases that dropped in the last 7 days (this week).
  // ?range=recent → already out (on/before today, last 90 days).
  // ?range=all    → upcoming + recent.   Default → upcoming-only (today forward).
  const range = req.nextUrl.searchParams.get("range");
  const week = range === "week";
  const recent = range === "recent";
  const all = range === "all";
  // Fetch lower bound: 7 days back for "this week", 90 days for recent/all, else today.
  let cutoffStr = todayStr;
  if (week) {
    const c = new Date();
    c.setDate(c.getDate() - 7);
    cutoffStr = c.toISOString().slice(0, 10);
  } else if (recent || all) {
    const c = new Date();
    c.setDate(c.getDate() - 90);
    cutoffStr = c.toISOString().slice(0, 10);
  }

  // One combined roster — mainstream, underground, acclaimed and online.
  const lists = await Promise.all(
    [...new Set(ARTISTS)].map((a) => recentForArtist(a, cutoffStr))
  );

  const seen = new Set<string>();
  const recs = lists.flat()
    .filter((r) => {
      const id = String(r.album.collectionId);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((r) => toRec(r.album));

  const upcoming = recs
    .filter((r) => r.releaseDate > todayStr)        // strictly after today
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)); // soonest first
  const past = recs
    .filter((r) => r.releaseDate <= todayStr && r.releaseDate >= cutoffStr) // already out, within window
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)); // most recent first

  // week → this week's drops only; all → upcoming first then recent;
  // recent → past only; default → upcoming only.
  const releases = (week ? past : all ? [...upcoming, ...past] : recent ? past : upcoming).slice(0, 80);

  return NextResponse.json(releases);
}
