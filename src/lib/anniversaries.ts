export interface Anniversary {
  spotifyId: string; // stable slug used in the album link (metadata is passed via query params)
  title: string;
  artist: string;
  year: number;
}

// Landmark albums keyed by their actual release date "MM-DD". A date may hold one
// album or several (shown as a slideshow). Artwork resolved at render time via iTunes.
export const ANNIVERSARY_MAP: Record<string, Anniversary | Anniversary[]> = {
  "01-08": { spotifyId: "blackstar-bowie", title: "Blackstar", artist: "David Bowie", year: 2016 },
  "02-04": { spotifyId: "rumours-fleetwood-mac", title: "Rumours", artist: "Fleetwood Mac", year: 1977 },
  "03-01": { spotifyId: "dark-side-pink-floyd", title: "The Dark Side of the Moon", artist: "Pink Floyd", year: 1973 },
  "03-15": { spotifyId: "tpab-kendrick", title: "To Pimp a Butterfly", artist: "Kendrick Lamar", year: 2015 },
  "03-23": { spotifyId: "madvillainy", title: "Madvillainy", artist: "Madvillain", year: 2004 },
  "04-14": { spotifyId: "damn-kendrick", title: "DAMN.", artist: "Kendrick Lamar", year: 2017 },
  "04-19": { spotifyId: "illmatic-nas", title: "Illmatic", artist: "Nas", year: 1994 },
  "04-23": { spotifyId: "lemonade-beyonce", title: "Lemonade", artist: "Beyoncé", year: 2016 },
  "05-08": { spotifyId: "let-it-be-beatles", title: "Let It Be", artist: "The Beatles", year: 1970 },
  "05-16": { spotifyId: "pet-sounds-beach-boys", title: "Pet Sounds", artist: "The Beach Boys", year: 1966 },
  "05-21": { spotifyId: "ok-computer-radiohead", title: "OK Computer", artist: "Radiohead", year: 1997 },
  "05-23": { spotifyId: "tommy-the-who", title: "Tommy", artist: "The Who", year: 1969 },
  "05-26": { spotifyId: "eminem-show", title: "The Eminem Show", artist: "Eminem", year: 2002 },
  "06-01": { spotifyId: "sgt-pepper-beatles", title: "Sgt. Pepper's Lonely Hearts Club Band", artist: "The Beatles", year: 1967 },
  "06-15": [
    { spotifyId: "unknown-pleasures-joy-division", title: "Unknown Pleasures", artist: "Joy Division", year: 1979 },
    { spotifyId: "bleach-nirvana", title: "Bleach", artist: "Nirvana", year: 1989 },
  ],
  "06-18": [
    { spotifyId: "yeezus-kanye-west", title: "Yeezus", artist: "Kanye West", year: 2013 },
    { spotifyId: "born-sinner-j-cole", title: "Born Sinner", artist: "J. Cole", year: 2013 },
    { spotifyId: "watching-movies-mac-miller", title: "Watching Movies with the Sound Off", artist: "Mac Miller", year: 2013 },
    { spotifyId: "punisher-phoebe-bridgers", title: "Punisher", artist: "Phoebe Bridgers", year: 2020 },
    { spotifyId: "odelay-beck", title: "Odelay", artist: "Beck", year: 1996 },
    { spotifyId: "from-her-to-eternity-nick-cave", title: "From Her to Eternity", artist: "Nick Cave and the Bad Seeds", year: 1984 },
    { spotifyId: "origin-of-symmetry-muse", title: "Origin of Symmetry", artist: "Muse", year: 2001 },
  ],
  "06-22": { spotifyId: "blue-joni-mitchell", title: "Blue", artist: "Joni Mitchell", year: 1971 },
  "06-25": { spotifyId: "purple-rain-prince", title: "Purple Rain", artist: "Prince and the Revolution", year: 1984 },
  "07-10": { spotifyId: "channel-orange-frank-ocean", title: "Channel Orange", artist: "Frank Ocean", year: 2012 },
  "07-29": { spotifyId: "renaissance-beyonce", title: "Renaissance", artist: "Beyoncé", year: 2022 },
  "08-03": { spotifyId: "astroworld-travis-scott", title: "Astroworld", artist: "Travis Scott", year: 2018 },
  "08-08": { spotifyId: "watch-the-throne", title: "Watch the Throne", artist: "Jay-Z & Kanye West", year: 2011 },
  "08-17": { spotifyId: "kind-of-blue-miles-davis", title: "Kind of Blue", artist: "Miles Davis", year: 1959 },
  "08-20": { spotifyId: "blonde-frank-ocean", title: "Blonde", artist: "Frank Ocean", year: 2016 },
  "08-22": { spotifyId: "dummy-portishead", title: "Dummy", artist: "Portishead", year: 1994 },
  "09-13": { spotifyId: "ready-to-die-biggie", title: "Ready to Die", artist: "The Notorious B.I.G.", year: 1994 },
  "09-14": { spotifyId: "funeral-arcade-fire", title: "Funeral", artist: "Arcade Fire", year: 2004 },
  "09-24": { spotifyId: "nevermind-nirvana", title: "Nevermind", artist: "Nirvana", year: 1991 },
  "09-26": { spotifyId: "abbey-road-beatles", title: "Abbey Road", artist: "The Beatles", year: 1969 },
  "10-02": { spotifyId: "kid-a-radiohead", title: "Kid A", artist: "Radiohead", year: 2000 },
  "10-10": { spotifyId: "in-rainbows-radiohead", title: "In Rainbows", artist: "Radiohead", year: 2007 },
  "10-31": { spotifyId: "stankonia-outkast", title: "Stankonia", artist: "OutKast", year: 2000 },
  "11-09": { spotifyId: "enter-the-wu-tang", title: "Enter the Wu-Tang (36 Chambers)", artist: "Wu-Tang Clan", year: 1993 },
  "11-17": { spotifyId: "double-fantasy-lennon", title: "Double Fantasy", artist: "John Lennon & Yoko Ono", year: 1980 },
  "11-22": { spotifyId: "mbdtf-kanye", title: "My Beautiful Dark Twisted Fantasy", artist: "Kanye West", year: 2010 },
  "11-23": { spotifyId: "doggystyle-snoop", title: "Doggystyle", artist: "Snoop Doggy Dogg", year: 1993 },
  "11-30": { spotifyId: "thriller-michael-jackson", title: "Thriller", artist: "Michael Jackson", year: 1982 },
  "12-13": { spotifyId: "beyonce-self-titled", title: "Beyoncé", artist: "Beyoncé", year: 2013 },
  "12-15": { spotifyId: "the-chronic-dr-dre", title: "The Chronic", artist: "Dr. Dre", year: 1992 },
  // More iconic albums for wider day-of coverage
  "01-28": { spotifyId: "anti-rihanna", title: "Anti", artist: "Rihanna", year: 2016 },
  "02-10": { spotifyId: "college-dropout-kanye", title: "The College Dropout", artist: "Kanye West", year: 2004 },
  "03-12": { spotifyId: "discovery-daft-punk", title: "Discovery", artist: "Daft Punk", year: 2001 },
  "04-29": { spotifyId: "views-drake", title: "Views", artist: "Drake", year: 2016 },
  "05-11": { spotifyId: "demon-days-gorillaz", title: "Demon Days", artist: "Gorillaz", year: 2005 },
  "05-17": { spotifyId: "ram-daft-punk", title: "Random Access Memories", artist: "Daft Punk", year: 2013 },
  "06-10": { spotifyId: "carter-iii-lil-wayne", title: "Tha Carter III", artist: "Lil Wayne", year: 2008 },
  "07-17": { spotifyId: "currents-tame-impala", title: "Currents", artist: "Tame Impala", year: 2015 },
  "08-25": { spotifyId: "born-to-run-springsteen", title: "Born to Run", artist: "Bruce Springsteen", year: 1975 },
  "09-09": { spotifyId: "am-arctic-monkeys", title: "AM", artist: "Arctic Monkeys", year: 2013 },
  "09-16": { spotifyId: "hounds-of-love-kate-bush", title: "Hounds of Love", artist: "Kate Bush", year: 1985 },
  "09-28": { spotifyId: "songs-key-of-life-stevie", title: "Songs in the Key of Life", artist: "Stevie Wonder", year: 1976 },
  "11-20": { spotifyId: "25-adele", title: "25", artist: "Adele", year: 2015 },
};

const asList = (v: Anniversary | Anniversary[] | undefined): Anniversary[] =>
  v ? (Array.isArray(v) ? v : [v]) : [];

// Returns every album that came out on today's date (or the nearest day within
// the window), so they can be shown as a slideshow.
export function getTodayAnniversaries(): { items: Anniversary[]; mmdd: string; isExact: boolean } | null {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const key = `${mm}-${dd}`;

  // Only the album(s) whose anniversary is TODAY — never yesterday's or older.
  // Recomputed from the current date, so it refreshes each day.
  if (ANNIVERSARY_MAP[key]) return { items: asList(ANNIVERSARY_MAP[key]), mmdd: key, isExact: true };
  return null;
}
