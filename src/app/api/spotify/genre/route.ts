import { NextRequest, NextResponse } from "next/server";
import { isLikelyAI } from "@/lib/aiFilter";
import { searchAppleAlbum } from "@/lib/appleMusic";

// Per-genre curated albums as "Title Artist" search queries.
// Uses the SEARCH endpoint (works from serverless) rather than album-by-ID (dev-mode restricted).
export const GENRE_QUERIES: Record<string, string[]> = {
  "Hip-Hop": [
    "To Pimp a Butterfly Kendrick Lamar",
    "good kid, m.A.A.d city Kendrick Lamar",
    "Section.80 Kendrick Lamar",
    "Mr. Morale & The Big Steppers Kendrick",
    "Donuts J Dilla",
    "Endtroducing DJ Shadow",
    "Pi\u00f1ata Freddie Gibbs & Madlib",
    "Bandana Freddie Gibbs & Madlib",
    "DAYTONA Pusha T",
    "The Low End Theory A Tribe Called Quest",
    "Midnight Marauders A Tribe Called Quest",
    "People's Instinctive Travels ATCQ",
    "fakemink",
    "redveil",
    "MIKE Burning Desire",
    "Earl Sweatshirt SICK!",
    "maxo Even God Has a Sense of Humor",
    "billy woods Aethiopes",
    "MAVI Let the Sun Talk",
    "Navy Blue Ways of Knowing",
    "Pink Siifu",
    "Mach-Hommy",
    "Quelle Chris",
  ],
  "Rap": [
    "Illmatic Nas",
    "Ready to Die Notorious B.I.G.",
    "Reasonable Doubt Jay-Z",
    "The Blueprint Jay-Z",
    "Madvillainy Madvillain",
    "Supreme Clientele Ghostface Killah",
    "Only Built 4 Cuban Linx Raekwon",
    "Enter The Wu-Tang Wu-Tang Clan",
    "Liquid Swords GZA",
    "Ironman Ghostface Killah",
    "Tical Method Man",
    "Blackout! Method Man & Redman",
    "Danny Brown Atrocity Exhibition",
    "Denzel Curry",
    "Armand Hammer",
    "Ka Descendants of Cain",
    "Roc Marciano",
    "Mick Jenkins",
    "Your Old Droog",
    "Boldy James",
    "Westside Gunn",
    "Conway the Machine",
    "Vince Staples",
    "JID The Forever Story",
  ],
  "R&B": [
    "Ctrl SZA",
    "Blonde Frank Ocean",
    "Lemonade Beyonc\u00e9",
    "What's Going On Marvin Gaye",
    "Innervisions Stevie Wonder",
    "Songs in the Key of Life Stevie Wonder",
    "Purple Rain Prince",
    "I Never Loved a Man Aretha Franklin",
    "Lady Soul Aretha Franklin",
    "Otis Blue Otis Redding",
    "Curtis Curtis Mayfield",
    "Extension of a Man Donny Hathaway",
  ],
  "Rock": [
    "OK Computer Radiohead",
    "In Utero Nirvana",
    "Ten Pearl Jam",
    "Superunknown Soundgarden",
    "Dirt Alice in Chains",
    "Badmotorfinger Soundgarden",
    "Bleach Nirvana",
    "Metallica",
    "Is This It The Strokes",
    "Room On Fire The Strokes",
    "White Blood Cells White Stripes",
    "Elephant White Stripes",
  ],
  "Alternative": [
    "In Rainbows Radiohead",
    "Kid A Radiohead",
    "The Bends Radiohead",
    "AM Arctic Monkeys",
    "Whatever People Say Arctic Monkeys",
    "Is This It The Strokes",
    "Room On Fire The Strokes",
    "Turn On The Bright Lights Interpol",
    "Silent Alarm Bloc Party",
    "Antidotes Foals",
    "White Blood Cells White Stripes",
    "Elephant White Stripes",
    "Geese 3D Country",
    "Black Country New Road Ants From Up There",
    "black midi Cavalcade",
    "Squid Bright Green Field",
    "Fontaines D.C. Skinty Fia",
    "Protomartyr Relatives in Descent",
    "Shame Songs of Praise",
    "Parquet Courts Wide Awake",
    "Gilla Band Most Normal",
    "Duster Stratosphere",
  ],
  "Indie": [
    "Funeral Arcade Fire",
    "Neon Bible Arcade Fire",
    "The Suburbs Arcade Fire",
    "For Emma, Forever Ago Bon Iver",
    "Weezer",
    "Yankee Hotel Foxtrot Wilco",
    "Illinois Sufjan Stevens",
    "Michigan Sufjan Stevens",
    "Person Pitch Panda Bear",
    "Merriweather Post Pavilion Animal Collective",
    "Sung Tongs Animal Collective",
    "Feels Animal Collective",
    "Geese Projector",
    "Wednesday Rat Saw God",
    "MJ Lenderman Manning Fireworks",
    "Alex G God Save the Animals",
    "Big Thief Dragon New Warm Mountain",
    "Snail Mail Lush",
    "Soccer Mommy Color Theory",
    "Hovvdy",
    "Hotline TNT Cartwheel",
    "They Are Gutting a Body of Water",
  ],
  "Metal": [
    "You Won't Go Before You're Supposed To Knocked Loose",
    "Take Me Back To Eden Sleep Token",
    "Eternal Blue Spiritbox",
    "Fortitude Gojira",
    "Magma Gojira",
    "RAT WARS HEALTH",
    "Of Mice and Men Restoring Force",
    "Sunbather Deafheaven",
    "Jane Doe Converge",
    "Toxicity System of a Down",
    "Metallica Ride the Lightning",
    "Vulgar Display of Power Pantera",
    "Chat Pile God's Country",
    "Gulch Impenetrable",
    "Jesus Piece So Unknown",
    "Gel Only Constant",
    "Scowl How Flowers Grow",
    "Full of Hell",
    "Portrayal of Guilt",
    "SeeYouSpaceCowboy",
    "Knocked Loose A Different Shade of Blue",
    "Drain Living Proof",
  ],
  "Jazz": [
    "Kind of Blue Miles Davis",
    "Bitches Brew Miles Davis",
    "A Love Supreme John Coltrane",
    "Giant Steps John Coltrane",
    "Speak No Evil Wayne Shorter",
    "Head Hunters Herbie Hancock",
    "Maiden Voyage Herbie Hancock",
    "Time Out Dave Brubeck",
    "Getz/Gilberto Stan Getz",
    "Moanin' Art Blakey",
    "Clifford Brown & Max Roach",
    "Blue Joni Mitchell",
  ],
  "Soul": [
    "What's Going On Marvin Gaye",
    "Innervisions Stevie Wonder",
    "Songs in the Key of Life Stevie Wonder",
    "I Never Loved a Man Aretha Franklin",
    "Lady Soul Aretha Franklin",
    "Otis Blue Otis Redding",
    "Curtis Curtis Mayfield",
    "Extension of a Man Donny Hathaway",
    "Gets Next to You Al Green",
    "Night Beat Sam Cooke",
    "Purple Rain Prince",
    "Ctrl SZA",
  ],
  "Electronic": [
    "Selected Ambient Works Aphex Twin",
    "Endtroducing DJ Shadow",
    "Music Has the Right to Children BoC",
    "Discovery Daft Punk",
    "Homework Daft Punk",
    "Dummy Portishead",
    "Mezzanine Massive Attack",
    "Blue Lines Massive Attack",
    "Debut Bj\u00f6rk",
    "Post Bj\u00f6rk",
    "Vespertine Bj\u00f6rk",
    "Donuts J Dilla",
    "Burial Untrue",
    "Boards of Canada Geogaddi",
    "Oneohtrix Point Never",
    "Jamie xx In Colour",
    "Four Tet There Is Love in You",
    "Floating Points",
    "Clams Casino Instrumentals",
    "Arca",
    "Mount Kimbie",
    "SBTRKT",
  ],
  "Pop": [
    "Thriller Michael Jackson",
    "Off the Wall Michael Jackson",
    "Purple Rain Prince",
    "1989 Taylor Swift",
    "Born This Way Lady Gaga",
    "Lemonade Beyonc\u00e9",
    "Back To Black Amy Winehouse",
    "21 Adele",
    "Ray of Light Madonna",
    "Teenage Dream Katy Perry",
    "Sgt Pepper The Beatles",
    "Blonde Frank Ocean",
  ],
  "Classical": [
    "Goldberg Variations Glenn Gould",
    "Symphony No.9 Beethoven",
    "Brandenburg Concertos Bach",
    "The Four Seasons Vivaldi",
    "Swan Lake Tchaikovsky",
    "Requiem Mozart",
    "Symphony Nos. 5 & 6 Beethoven",
    "Cello Suites Bach / Yo-Yo Ma",
    "Piano Concerto No.2 Rachmaninoff",
    "A Love Supreme Coltrane",
    "Time Out Dave Brubeck",
    "Kind of Blue Miles Davis",
  ],
  "Reggae": [
    "Exodus Bob Marley",
    "Catch A Fire Bob Marley",
    "Burnin' Bob Marley",
    "Natty Dread Bob Marley",
    "Legend Bob Marley",
    "The Harder They Come Jimmy Cliff",
    "Pressure Drop Toots & The Maytals",
    "Police And Thieves Junior Murvin",
    "Handsworth Revolution Steel Pulse",
    "Marcus Garvey Burning Spear",
    "Pressure Drop Toots",
  ],
  "Latin": [
    "Un Verano Sin Ti Bad Bunny",
    "YHLQMDLG Bad Bunny",
    "X 100PRE Bad Bunny",
    "Buena Vista Social Club",
    "Contra La Corriente Marc Anthony",
    "La Voz H\u00e9ctor Lavoe",
    "Amor Prohibido Selena",
    "Laundry Service Shakira",
    "La Reina Celia Cruz",
    "Peso Pluma",
    "KAROL G",
  ],
  "Blues": [
    "King of the Delta Blues Robert Johnson",
    "The Complete Recordings Robert Johnson",
    "Live at the Regal B.B. King",
    "Live at the Checkerboard Muddy Waters",
    "Moanin' in the Moonlight Howlin' Wolf",
    "Father of the Delta Blues Son House",
    "Boom Boom John Lee Hooker",
    "The Sky is Crying Elmore James",
    "At Last! Etta James",
    "Born to Play Guitar Buddy Guy",
  ],
  "Punk": [
    "Never Mind the Bollocks Sex Pistols",
    "Ramones Ramones",
    "Rocket to Russia Ramones",
    "London Calling The Clash",
    "Combat Rock The Clash",
    "My War Black Flag",
    "Singles Going Steady Buzzcocks",
    "Rock for Light Bad Brains",
    "Damaged Black Flag",
    "Group Sex Circle Jerks",
    "Suffer Bad Religion",
    "Fresh Fruit for Rotting Vegetables Dead Kennedys",
    "Jeff Rosenstock Worry",
    "PUP The Dream Is Over",
    "Joyce Manor",
    "Turnstile Glow On",
    "Militarie Gun Life Under the Gun",
    "Soul Glo Diaspora Problems",
    "Gouge Away",
    "Drug Church Hygiene",
    "Scowl",
    "Gel Only Constant",
  ],
  "Shoegaze": [
    "Loveless My Bloody Valentine",
    "m b v My Bloody Valentine",
    "Isn't Anything My Bloody Valentine",
    "Souvlaki Slowdive",
    "Pygmalion Slowdive",
    "Nowhere Ride",
    "Going Blank Again Ride",
    "Heaven or Las Vegas Cocteau Twins",
    "Whirlpool Chapterhouse",
    "Spooky Lush",
    "Oshin DIIV",
    "Sunbather Deafheaven",
    "DIIV Deceiver",
    "Whirr",
    "Nothing Guilty of Everything",
    "Wisp",
    "Julie my anti-aircraft friend",
    "They Are Gutting a Body of Water",
    "Title Fight Hyperview",
    "Fleeting Joys",
    "Narrow Head Moments of Clarity",
    "Flyying Colours",
  ],
  "Lo-Fi": [
    "Donuts J Dilla",
    "Endtroducing DJ Shadow",
    "Madvillainy Madvillain",
    "Blackout! Method Man & Redman",
    "Pi\u00f1ata Freddie Gibbs",
    "Bandana Freddie Gibbs",
    "DAYTONA Pusha T",
    "Supreme Clientele Ghostface",
    "Liquid Swords GZA",
    "Ironman Ghostface",
    "Tical Method Man",
    "Only Built 4 Cuban Linx Raekwon",
    "Alex G Trick",
    "Duster Stratosphere",
    "Elliott Smith Either/Or",
    "(Sandy) Alex G Rocket",
    "Teen Suicide",
    "Nicole Dollanganger",
    "Have a Nice Life Deathconsciousness",
    "Sweet Trip",
    "Hovvdy",
    "Standards",
  ],
  "Country": [
    "Golden Hour Kacey Musgraves",
    "At Folsom Prison Johnny Cash",
    "Red Headed Stranger Willie Nelson",
    "Traveller Chris Stapleton",
    "Metamodern Sounds in Country Music Sturgill Simpson",
    "Purgatory Tyler Childers",
    "American Heartbreak Zach Bryan",
    "Coal Miner's Daughter Loretta Lynn",
    "Modern Sounds in Country and Western Music Ray Charles",
    "Pageant Material Kacey Musgraves",
    "Stardust Willie Nelson",
    "The Highwomen The Highwomen",
    "Wildflowers Tom Petty",
    "Live at the Ryman Sturgill Simpson",
  ],
  "Folk": [
    "Blue Joni Mitchell",
    "The Freewheelin' Bob Dylan",
    "Pink Moon Nick Drake",
    "For Emma, Forever Ago Bon Iver",
    "Carrie & Lowell Sufjan Stevens",
    "Sounds of Silence Simon & Garfunkel",
    "Songs of Leonard Cohen Leonard Cohen",
    "Nebraska Bruce Springsteen",
    "Either/Or Elliott Smith",
    "Punisher Phoebe Bridgers",
    "Heartbreaker Ryan Adams",
    "Seven Swans Sufjan Stevens",
    "Five Leaves Left Nick Drake",
    "If You're Feeling Sinister Belle and Sebastian",
  ],

  // --- Subgenre-specific curated lists (keys must match GENRE_TAXONOMY spellings) ---
  "Grunge": [
    "Nevermind Nirvana", "In Utero Nirvana", "Bleach Nirvana",
    "Ten Pearl Jam", "Vs. Pearl Jam", "Dirt Alice in Chains", "Facelift Alice in Chains",
    "Superunknown Soundgarden", "Badmotorfinger Soundgarden",
    "Core Stone Temple Pilots", "Sixteen Stone Bush", "Temple of the Dog Temple of the Dog",
  ],
  "Britpop": [
    "Definitely Maybe Oasis", "(What's the Story) Morning Glory? Oasis",
    "Parklife Blur", "The Great Escape Blur", "Modern Life Is Rubbish Blur",
    "Different Class Pulp", "His 'n' Hers Pulp", "Urban Hymns The Verve",
    "Dog Man Star Suede", "Suede Suede", "Elastica Elastica",
  ],
  "Post-Punk": [
    "Unknown Pleasures Joy Division", "Closer Joy Division",
    "Marquee Moon Television", "Entertainment! Gang of Four", "Pink Flag Wire",
    "Seventeen Seconds The Cure", "Metal Box Public Image Ltd",
    "Turn On the Bright Lights Interpol", "Crocodiles Echo & the Bunnymen",
  ],
  "Classic Rock": [
    "Led Zeppelin IV Led Zeppelin", "The Dark Side of the Moon Pink Floyd",
    "Who's Next The Who", "Exile on Main St. The Rolling Stones",
    "Rumours Fleetwood Mac", "Hotel California Eagles",
    "Born to Run Bruce Springsteen", "A Night at the Opera Queen",
  ],
  "Hard Rock": [
    "Back in Black AC/DC", "Highway to Hell AC/DC",
    "Appetite for Destruction Guns N' Roses", "Paranoid Black Sabbath",
    "Van Halen Van Halen", "Led Zeppelin II Led Zeppelin", "Toys in the Attic Aerosmith",
  ],
  "Psychedelic Rock": [
    "Sgt. Pepper's Lonely Hearts Club Band The Beatles", "Revolver The Beatles",
    "Are You Experienced The Jimi Hendrix Experience", "The Doors The Doors",
    "Surrealistic Pillow Jefferson Airplane", "The Piper at the Gates of Dawn Pink Floyd",
  ],
  "Progressive Rock": [
    "The Dark Side of the Moon Pink Floyd", "Wish You Were Here Pink Floyd",
    "Close to the Edge Yes", "In the Court of the Crimson King King Crimson",
    "Selling England by the Pound Genesis", "2112 Rush",
  ],
  "Punk Rock": [
    "Ramones Ramones", "Never Mind the Bollocks Sex Pistols",
    "London Calling The Clash", "The Clash The Clash", "Damned Damned Damned The Damned",
  ],
  "Post-Rock": [
    "Lift Your Skinny Fists Like Antennas to Heaven Godspeed You! Black Emperor",
    "F♯ A♯ ∞ Godspeed You! Black Emperor", "Ágætis byrjun Sigur Rós",
    "( ) Sigur Rós", "Spiderland Slint", "Hymn to the Immortal Wind Mono",
  ],
  "Indie Rock": [
    "Funeral Arcade Fire", "Is This It The Strokes", "Turn On the Bright Lights Interpol",
    "Silent Alarm Bloc Party", "Boxer The National", "Transatlanticism Death Cab for Cutie",
  ],
  "Emo": [
    "The Black Parade My Chemical Romance", "Clarity Jimmy Eat World",
    "Bleed American Jimmy Eat World", "Tell All Your Friends Taking Back Sunday",
    "Deja Entendu Brand New", "The Devil and God Are Raging Inside Me Brand New",
  ],
  "Midwest Emo": [
    "American Football American Football", "Diary Sunny Day Real Estate",
    "The Power of Failing Mineral", "Nothing Feels Good The Promise Ring",
    "Analphabetapolothology Cap'n Jazz",
  ],
  "Dream Pop": [
    "Heaven or Las Vegas Cocteau Twins", "So Tonight That I Might See Mazzy Star",
    "Teen Dream Beach House", "Bloom Beach House", "Souvlaki Slowdive",
  ],
  "Trap": [
    "Rodeo Travis Scott", "Astroworld Travis Scott", "DS2 Future",
    "Barter 6 Young Thug", "Die Lit Playboi Carti", "Culture Migos", "Without Warning 21 Savage",
  ],
  "Boom Bap": [
    "Illmatic Nas", "Enter the Wu-Tang (36 Chambers) Wu-Tang Clan",
    "Ready to Die The Notorious B.I.G.", "The Low End Theory A Tribe Called Quest",
    "Moment of Truth Gang Starr", "Only Built 4 Cuban Linx Raekwon",
  ],
  "G-Funk": [
    "The Chronic Dr. Dre", "Doggystyle Snoop Dogg",
    "Regulate... G Funk Era Warren G", "All Eyez on Me 2Pac",
  ],
  "Conscious Hip Hop": [
    "To Pimp a Butterfly Kendrick Lamar", "Like Water for Chocolate Common",
    "Black on Both Sides Mos Def", "The Miseducation of Lauryn Hill Lauryn Hill",
  ],
  "Heavy Metal": [
    "Paranoid Black Sabbath", "The Number of the Beast Iron Maiden",
    "Master of Puppets Metallica", "Ace of Spades Motörhead", "British Steel Judas Priest",
  ],
  "Thrash Metal": [
    "Master of Puppets Metallica", "Ride the Lightning Metallica",
    "Reign in Blood Slayer", "Rust in Peace Megadeth", "Among the Living Anthrax",
  ],
  "Black Metal": [
    "De Mysteriis Dom Sathanas Mayhem", "Transilvanian Hunger Darkthrone",
    "In the Nightside Eclipse Emperor", "A Blaze in the Northern Sky Darkthrone", "Filosofem Burzum",
  ],
  "Nu Metal": [
    "Hybrid Theory Linkin Park", "Meteora Linkin Park", "Toxicity System of a Down",
    "Korn Korn", "Follow the Leader Korn", "Significant Other Limp Bizkit",
  ],
  "Metalcore": [
    "Jane Doe Converge", "Ascendancy Trivium", "The Poison Bullet for My Valentine",
    "Waking the Fallen Avenged Sevenfold",
  ],
  "Ambient": [
    "Music for Airports Brian Eno", "Ambient 1 Brian Eno",
    "Selected Ambient Works 85-92 Aphex Twin", "Substrata Biosphere",
  ],
  "Trip Hop": [
    "Dummy Portishead", "Blue Lines Massive Attack", "Mezzanine Massive Attack", "Maxinquaye Tricky",
  ],
  "Synth-Pop": [
    "Violator Depeche Mode", "Dare The Human League",
    "Speak & Spell Depeche Mode", "Non-Stop Erotic Cabaret Soft Cell",
  ],
  "Pop Punk": [
    "Dookie Green Day", "American Idiot Green Day", "Enema of the State blink-182",
    "Take Off Your Pants and Jacket blink-182", "The Black Parade My Chemical Romance",
  ],
  "Jazz Fusion": [
    "Bitches Brew Miles Davis", "Head Hunters Herbie Hancock",
    "Birds of Fire Mahavishnu Orchestra", "Heavy Weather Weather Report",
  ],
  "Spiritual Jazz": [
    "A Love Supreme John Coltrane", "Karma Pharoah Sanders", "Journey in Satchidananda Alice Coltrane",
  ],
  "Neo Soul": [
    "Voodoo D'Angelo", "Brown Sugar D'Angelo", "Baduizm Erykah Badu",
    "Mama's Gun Erykah Badu", "The Miseducation of Lauryn Hill Lauryn Hill",
  ],
  "Funk": [
    "Maggot Brain Funkadelic", "One Nation Under a Groove Funkadelic",
    "Mothership Connection Parliament", "Superfly Curtis Mayfield",
  ],
};

// Reject tributes, karaoke, covers, instrumentals, etc. (singles & EPs ARE allowed)
const BAD = /\b(tribute|karaoke|made famous|in the style of|originally performed|cover version|covers of|string quartet|lullaby|piano versions?|instrumental|8-bit|performs|solo violin|sub par|parody|parodies|spoof)\b/i;
const BAD_ARTIST = /various artists|karaoke|tribute|vitamin string|string quartet|\bvsq\b|the insurgency|sub par all star|\bcover/i;

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
  collectionType?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Run an async fn over items with bounded concurrency. iTunes throttles bursts,
// so firing all ~22 queries at once made whole genres come back empty; a small
// pool keeps us under the rate limit while staying fast.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type GenreAlbum = { id: string; title: string; artist: string; artwork: string; year: number | null };

// Non-canonical editions that share an album's name+artist (so they tie on word
// overlap): instrumentals, beat tapes, remixes, deluxe/live/etc.
const VARIANT = /instrumental|\bbeats\b|remix|deluxe|\blive\b|karaoke|\bversion\b|\bedition\b|\bdemos?\b|commentary|b.?sides?|screwed|chopped|slowed|acoustic|reprise/i;

// Resolve a single album for a curated query. Exported for the onboarding
// endpoints (random album / discover grid).
export async function fetchOne(q: string) {
  return (await fetchAlbums(q, 1))[0] ?? null;
}

// Resolve up to `max` distinct albums for a curated query. Apple Music first
// (canonical albums iTunes omits, e.g. Madvillainy), then iTunes fills the
// remaining slots. Retries on throttle/network errors. Used by the genre browse
// to gather enough albums to show up to 30 per genre.
async function fetchAlbums(q: string, max = 1): Promise<GenreAlbum[]> {
  const out: GenreAlbum[] = [];
  const ids = new Set<string>();

  const am = await searchAppleAlbum(q).catch(() => null);
  if (am && am.artwork) {
    out.push({ id: am.id, title: am.title, artist: am.artist, artwork: am.artwork, year: am.year });
    ids.add(am.id);
  }
  if (out.length >= max) return out;

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=${Math.max(5, max * 5)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Cache successful lookups for a week; bypass cache on retries so a throttled
      // response isn't what we keep reading back.
      const r = await fetch(url, attempt === 0 ? { next: { revalidate: 604800 } } : { cache: "no-store" });
      if (!r.ok) { await sleep(250 * (attempt + 1)); continue; }
      const d = await r.json();
      const results: ItunesAlbum[] = d.results ?? [];

      const valid = results.filter((x) =>
        x.collectionId &&
        x.artworkUrl100 &&
        x.collectionName &&
        x.artistName &&
        !BAD.test(x.collectionName) &&
        !BAD_ARTIST.test(x.artistName) &&
        !isLikelyAI(x.artistName, x.collectionName)
        // singles & EPs allowed — no trackCount restriction
      );
      // iTunes' first result isn't always the intended album (tributes, same-named
      // albums, wrong artists). Score each candidate by how many of the query's
      // words appear in its "title artist", and take the best matches — so the
      // curated query resolves to that album, not whatever iTunes lists first.
      const norm = (s: string) => " " + s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
      const qWords = norm(q).trim().split(" ").filter((w) => w.length > 1);
      const qWantsVariant = VARIANT.test(q);
      const scoreOf = (x: ItunesAlbum) => {
        const hay = norm(`${x.collectionName} ${x.artistName}`);
        let s = qWords.reduce((n, w) => n + (hay.includes(" " + w + " ") ? 1 : 0), 0);
        // Gently demote editions the query didn't ask for, so the canonical album
        // wins a tie — but not so hard it loses to an unrelated album when iTunes
        // only carries the edition (then the same album's variant is the best fit).
        if (!qWantsVariant && VARIANT.test(x.collectionName as string)) s -= 1;
        return s;
      };
      const ranked = valid
        .map((x) => ({ x, s: scoreOf(x) }))
        .filter((e) => e.s > 0) // no real match — don't surface a wrong album
        .sort((p, r) => r.s - p.s);
      for (const { x } of ranked) {
        const id = String(x.collectionId);
        if (ids.has(id)) continue;
        ids.add(id);
        out.push({
          id,
          title: x.collectionName as string,
          artist: x.artistName as string,
          artwork: (x.artworkUrl100 as string).replace("100x100bb", "600x600bb"),
          year: x.releaseDate ? parseInt(x.releaseDate.slice(0, 4)) : null,
        });
        if (out.length >= max) break;
      }
      break; // got a usable response — stop retrying
    } catch {
      await sleep(250 * (attempt + 1));
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("genre");
  if (!genre || !GENRE_QUERIES[genre]) {
    return NextResponse.json({ error: "Unknown genre" }, { status: 400 });
  }
  try {
    const queries = GENRE_QUERIES[genre];
    // Up to 2 albums per curated query so bigger genres can fill the 30-album
    // grid. Bounded concurrency (5) keeps us under iTunes' burst rate limit.
    const lists = await mapLimit(queries, 5, (q) => fetchAlbums(q, 2));
    const out: GenreAlbum[] = [];
    const seen = new Set<string>();
    outer: for (const list of lists) {
      for (const a of list) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        out.push(a);
        // Return more than the 30 shown up front so the grid's "See more" has
        // extra albums to reveal; bounded to keep the response reasonable.
        if (out.length >= 48) break outer;
      }
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
