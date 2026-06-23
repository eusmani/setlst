import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";

// An artist is either a name (search) or {name, id} pinned to a specific iTunes artist
type Artist = string | { name: string; id: number };

// Underground artists — prioritized on the radar
const UNDERGROUND: Artist[] = [
  // underground hip-hop
  "fakemink", "Terrified", "Nettspend", "xaviersobased", "2hollis", "redveil",
  "MIKE", "Earl Sweatshirt", "Navy Blue",
  { name: "MAVI", id: 1195625355 }, // pin to the rapper MAVI (not the pop artist)
  "billy woods", "Mach-Hommy",
  "Boldy James", "Westside Gunn", "JPEGMAFIA", "Danny Brown", "Denzel Curry",
  "Quelle Chris", "Pink Siifu", "maxo", "AKAI SOLO", "Wiki",
  "Conway the Machine", "Benny the Butcher", "Ka", "Roc Marciano", "Your Old Droog",
  "medhane", "Bruiser Wolf", "veeze", "BabyTron", "RXKNephew", "Lukah",
  "Pa Salieu", "Sampa the Great",
  // indie / alt underground
  "Wednesday", "MJ Lenderman", "Geese", "Black Country, New Road", "black midi",
  "Fontaines D.C.", "Alex G", "Hotline TNT", "They Are Gutting a Body of Water",
  "julie", "Narrow Head", "Title Fight",
  "Snail Mail", "Soccer Mommy", "Horsegirl", "Wishy", "feeble little horse",
  "Friko", "Been Stellar", "Crumb", "Momma", "Hovvdy", "Truth Club", "Wild Pink",
  "Mannequin Pussy", "Militarie Gun", "Origami Angel", "Carly Cosgrove",
  // metal / hardcore underground
  "Knocked Loose", "Chat Pile", "Gulch", "Jesus Piece", "Gel", "Scowl",
  "Full of Hell", "Portrayal of Guilt", "SeeYouSpaceCowboy", "Spiritbox", "Deafheaven",
  "Turnstile", "Drug Church", "End It", "Zulu", "Speed", "Sunami", "Mizery",
  // electronic / shoegaze underground
  "Burial", "DIIV", "Slowdive", "Four Tet", "Jamie xx",
  "Wisp", "Julie Christmas", "Parannoul", "Weatherday", "Jane Remover", "quannnic",
  // UK underground — grime / rap / drill
  "Knucks", "Ghetts", "Kano", "Berwyn", "Jeshi", "Wu-Lu", "Loyle Carner",
  "Lancey Foux", "Little Simz", "Headie One", "Nia Archives",
  // UK post-punk / indie
  "Squid", "Shame", "Dry Cleaning", "Sorry", "Jockstrap", "Folly Group",
  "caroline", "Goat Girl", "English Teacher", "The Last Dinner Party",
  "Lambrini Girls", "Sprints",
  // UK jazz
  "Ezra Collective", "Nubya Garcia", "Moses Boyd", "Yussef Dayes", "Kokoroko",
  // UK electronic
  "Overmono", "Joy Orbison",
  // Canadian underground
  "Mustafa", "Charlotte Day Wilson", "BADBADNOTGOOD", "Men I Trust", "Crack Cloud",
  "Snotty Nose Rez Kids", "TOBi", "Haviah Mighty", "Homeshake", "METZ",
  "Fucked Up", "Mac DeMarco", "Yves Jarvis", "Cadence Weapon",
];

// Mainstream — a broad, genre-spanning roster of major artists so the radar
// catches essentially anyone putting out music across the year.
const MAINSTREAM: Artist[] = [
  // pop
  "Taylor Swift", "Billie Eilish", "Olivia Rodrigo", "Sabrina Carpenter",
  "Ariana Grande", "Dua Lipa", "Chappell Roan", "Gracie Abrams", "Benson Boone",
  "Teddy Swims", "Noah Kahan", "Hozier", "Lana Del Rey", "Lorde", "Halsey",
  "Katy Perry", "Lady Gaga", "Miley Cyrus", "Selena Gomez", "Camila Cabello",
  "Demi Lovato", "Shawn Mendes", "Maroon 5", "OneRepublic", "Imagine Dragons",
  "Twenty One Pilots", "P!nk", "Kelly Clarkson", "Bruno Mars", "Charli XCX",
  "Troye Sivan", "Conan Gray", "Tate McRae", "Addison Rae", "Tinashe",
  // hip-hop / rap
  "Kendrick Lamar", "Drake", "J. Cole", "Travis Scott", "Future", "Metro Boomin",
  "Playboi Carti", "Lil Uzi Vert", "21 Savage", "Lil Baby", "Gunna", "Lil Durk",
  "Nicki Minaj", "Cardi B", "Megan Thee Stallion", "Latto", "GloRilla", "Ice Spice",
  "Doja Cat", "Jack Harlow", "Tyler, the Creator", "A$AP Rocky", "Don Toliver",
  "JID", "Vince Staples", "Lil Wayne", "Eminem", "Kanye West", "Pusha T",
  "Roddy Ricch", "Polo G", "NLE Choppa", "Offset", "Quavo", "Central Cee",
  "Stormzy", "Skepta", "Dave",
  // R&B / soul
  "SZA", "The Weeknd", "Frank Ocean", "Brent Faiyaz", "Summer Walker",
  "Jhené Aiko", "H.E.R.", "Giveon", "Khalid", "Chris Brown", "Usher", "Miguel",
  "Kehlani", "Victoria Monét", "Coco Jones", "Muni Long", "Daniel Caesar",
  "PARTYNEXTDOOR", "Bryson Tiller", "Solange", "Janelle Monáe", "RAYE",
  // rock / alternative
  "Arctic Monkeys", "Tame Impala", "The 1975", "Foo Fighters",
  "Red Hot Chili Peppers", "Paramore", "Green Day", "Fall Out Boy", "Linkin Park",
  "Pearl Jam", "Muse", "Gorillaz", "Vampire Weekend", "The Killers",
  "Kings of Leon", "Glass Animals", "Cage the Elephant", "Coldplay",
  "Phoebe Bridgers", "boygenius", "The National",
  // country / americana
  "Morgan Wallen", "Luke Combs", "Zach Bryan", "Chris Stapleton",
  "Kacey Musgraves", "Jelly Roll", "Lainey Wilson", "Kelsea Ballerini",
  "Cody Johnson", "Tyler Childers", "Megan Moroney", "Post Malone",
  // latin / global
  "Bad Bunny", "Karol G", "Peso Pluma", "Feid", "Rauw Alejandro", "J Balvin",
  "Maluma", "Shakira", "Rosalía", "Myke Towers", "Rema", "Burna Boy", "Wizkid",
  "Tems", "Asake", "Tyla",
  // electronic / dance
  "Calvin Harris", "David Guetta", "Marshmello", "Skrillex", "Fred again..",
  "Disclosure", "Flume", "Kaytranada", "ODESZA", "Zedd", "Illenium", "Daft Punk",
  // k-pop
  "BTS", "BLACKPINK", "Stray Kids", "SEVENTEEN", "TWICE", "NewJeans",
  "LE SSERAFIM", "aespa", "Jung Kook", "Jimin", "ROSÉ", "Lisa",
  // singer-songwriter / other
  "Ed Sheeran", "Adele", "Harry Styles", "Sam Smith", "Justin Bieber",
  "Carly Rae Jepsen", "Charlotte Cardin", "FKA twigs", "PinkPantheress",
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

  const [underLists, mainLists] = await Promise.all([
    Promise.all([...new Set(UNDERGROUND)].map((a) => recentForArtist(a, cutoffStr))),
    Promise.all([...new Set(MAINSTREAM)].map((a) => recentForArtist(a, cutoffStr))),
  ]);

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

  // Underground claims duplicate IDs first, then mainstream fills the rest.
  const underground = dedupSort(underLists);
  const mainstream = dedupSort(mainLists);
  const all = [...underground, ...mainstream];

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
