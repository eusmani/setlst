import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";

// An artist is either a name (search) or {name, id} pinned to a specific iTunes artist
type Artist = string | { name: string; id: number };

// The most popular / recognizable UNDERGROUND artists — the online digicore,
// hyperpop, underground rap and shoegaze scenes that fans instantly recognize.
const POPULAR_UNDERGROUND: Artist[] = [
  // digicore / hyperpop / glitchcore
  "fakemink", "underscores", "Jane Remover", "ericdoa", "glaive", "midwxst",
  "aldn", "brakence", "quannnic", "Wisp", "d0llywood1", "p4rkr", "osquinn",
  "twikipedia", "8485", "Frost Children", "food house", "Gupi", "fraxiom",
  "umru", "Dorian Electra", "Hannah Diamond", "A. G. Cook", "100 gecs",
  "Black Dresses", "Machine Girl", "Sematary", "Foxes",
  // drain gang / sad boys
  "Bladee", "Ecco2k", "Thaiboy Digital", "Yung Lean",
  // online / underground rap
  "Nettspend", "xaviersobased", "2hollis", "redveil", "SoFaygo", "Ka$hdami",
  "TiaCorine", "che", "Lazer Dim 700", "loveboatluciano", "1oneam",
  // acclaimed underground hip-hop
  "MIKE", "Earl Sweatshirt", "Navy Blue", "billy woods", "Mach-Hommy",
  "JPEGMAFIA", "Danny Brown", "Denzel Curry", "Westside Gunn",
  "Conway the Machine", "Benny the Butcher",
  // online shoegaze / underground indie
  "Parannoul", "Weatherday", "feeble little horse", "julie",
  "They Are Gutting a Body of Water", "Narrow Head", "Wednesday",
  "MJ Lenderman", "Alex G", "Hotline TNT", "Snail Mail", "Soccer Mommy",
  "DIIV", "Slowdive", "Crumb", "Mac DeMarco",
];

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
  // ?range=recent → albums already out, on/before today (most recent first).
  // Default → upcoming-only, today forward (soonest first). Nothing prior to today.
  const recent = req.nextUrl.searchParams.get("range") === "recent";
  // Per-artist iTunes fetch lower bound: 90 days back for recent, today for upcoming.
  let cutoffStr = todayStr;
  if (recent) {
    const c = new Date();
    c.setDate(c.getDate() - 90);
    cutoffStr = c.toISOString().slice(0, 10);
  }

  // Only the most popular/recognizable underground artists.
  const mainLists = await Promise.all(
    [...new Set(POPULAR_UNDERGROUND)].map((a) => recentForArtist(a, cutoffStr))
  );

  const seen = new Set<string>();
  const dedupSort = (lists: { artist: string; album: ItunesAlbum }[][]) =>
    lists.flat()
      .filter((r) => {
        const id = String(r.album.collectionId);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => (b.album.releaseDate ?? "").localeCompare(a.album.releaseDate ?? ""))
      .map((r) => toRec(r.album));

  const all = dedupSort(mainLists);

  // recent → already out (on/before today), most recent first.
  // default → upcoming (today forward), soonest first. Nothing prior to today.
  const releases = recent
    ? all
        .filter((r) => r.releaseDate <= todayStr)
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
        .slice(0, 80)
    : all
        .filter((r) => r.releaseDate >= todayStr)
        .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
        .slice(0, 80);

  return NextResponse.json(releases);
}
