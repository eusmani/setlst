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

// Mainstream — widely-recognized, charting / socially-popular artists across genres.
const MAINSTREAM: Artist[] = [
  // pop
  "Taylor Swift", "Billie Eilish", "Olivia Rodrigo", "Sabrina Carpenter",
  "Ariana Grande", "Dua Lipa", "Chappell Roan", "Gracie Abrams", "Benson Boone",
  "Teddy Swims", "Noah Kahan", "Hozier", "Lana Del Rey", "Lorde", "Halsey",
  "Katy Perry", "Lady Gaga", "Miley Cyrus", "Selena Gomez", "Camila Cabello",
  "Shawn Mendes", "Maroon 5", "OneRepublic", "Imagine Dragons",
  "Twenty One Pilots", "Bruno Mars", "Charli XCX",
  "Troye Sivan", "Conan Gray", "Tate McRae", "Addison Rae", "Tinashe",
  // hip-hop / rap
  "Kendrick Lamar", "Drake", "J. Cole", "Travis Scott", "Future", "Metro Boomin",
  "Playboi Carti", "Lil Uzi Vert", "21 Savage", "Lil Baby", "Gunna", "Lil Durk",
  "Nicki Minaj", "Cardi B", "Megan Thee Stallion", "Latto", "GloRilla", "Ice Spice",
  "Doja Cat", "Jack Harlow", "Tyler, the Creator", "A$AP Rocky", "Don Toliver",
  "JID", "Vince Staples", "Lil Wayne", "Eminem", "Kanye West", "Pusha T",
  "Central Cee", "Stormzy", "Skepta", "Dave",
  // R&B / soul
  "SZA", "The Weeknd", "Frank Ocean", "Brent Faiyaz", "Summer Walker",
  "Jhené Aiko", "Giveon", "Khalid", "Usher", "Kehlani", "Victoria Monét",
  "Coco Jones", "Daniel Caesar", "PARTYNEXTDOOR", "Bryson Tiller", "RAYE",
  // rock / alternative
  "Arctic Monkeys", "Tame Impala", "The 1975", "Foo Fighters",
  "Paramore", "Green Day", "Linkin Park", "Gorillaz", "Vampire Weekend",
  "The Killers", "Glass Animals", "Coldplay", "Phoebe Bridgers", "boygenius", "The National",
  // country / americana
  "Morgan Wallen", "Luke Combs", "Zach Bryan", "Chris Stapleton",
  "Kacey Musgraves", "Jelly Roll", "Lainey Wilson", "Tyler Childers", "Post Malone",
  // latin / global
  "Bad Bunny", "Karol G", "Peso Pluma", "Feid", "Rauw Alejandro",
  "Shakira", "Rosalía", "Rema", "Burna Boy", "Wizkid", "Tems", "Asake", "Tyla",
  // electronic / dance
  "Calvin Harris", "Skrillex", "Fred again..", "Disclosure", "Flume",
  "Kaytranada", "ODESZA", "Daft Punk",
  // k-pop
  "BTS", "BLACKPINK", "Stray Kids", "SEVENTEEN", "NewJeans", "LE SSERAFIM", "aespa",
  // singer-songwriter / other
  "Ed Sheeran", "Adele", "Harry Styles", "Sam Smith", "Justin Bieber",
  "FKA twigs", "PinkPantheress",
];

// One combined radar roster — mainstream, underground, acclaimed and online together.
const ARTISTS: Artist[] = [...MAINSTREAM, ...POPULAR_UNDERGROUND];

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
  // ?range=recent → already out (on/before today).  ?range=all → upcoming + recent.
  // Default → upcoming-only (today forward).
  const range = req.nextUrl.searchParams.get("range");
  const recent = range === "recent";
  const all = range === "all";
  // Fetch lower bound: 90 days back when we need recent releases, else today.
  let cutoffStr = todayStr;
  if (recent || all) {
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
    .filter((r) => r.releaseDate <= todayStr)        // already out
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)); // most recent first

  // all → upcoming first, then recent; recent → past only; default → upcoming only.
  const releases = (all ? [...upcoming, ...past] : recent ? past : upcoming).slice(0, 80);

  return NextResponse.json(releases);
}
