// A broad, roughly popularity-ranked roster of well-known artists across genres.
// Used by album search to surface the most popular matching artists first when a
// user types a prefix (e.g. "P" → Pink Floyd, PinkPantheress, Phoebe Bridgers…).
// Order matters: earlier = more prominent, so it wins ties within a prefix.
export const POPULAR_ARTISTS: string[] = [
  // all-time / megastars
  "The Beatles", "Michael Jackson", "Queen", "Led Zeppelin", "Pink Floyd",
  "David Bowie", "Prince", "Bob Dylan", "The Rolling Stones", "Fleetwood Mac",
  "Nirvana", "Radiohead", "The Beach Boys", "Stevie Wonder", "Marvin Gaye",
  // hip-hop canon
  "Kendrick Lamar", "Kanye West", "Jay-Z", "Nas", "Eminem", "Tupac", "The Notorious B.I.G.",
  "OutKast", "A Tribe Called Quest", "Wu-Tang Clan", "Dr. Dre", "Snoop Dogg",
  "Drake", "J. Cole", "Travis Scott", "Tyler, the Creator", "Kid Cudi", "Mac Miller",
  "Playboi Carti", "Lil Uzi Vert", "Future", "Metro Boomin", "21 Savage", "Lil Wayne",
  "Lil Baby", "Gunna", "Lil Durk", "Nicki Minaj", "Cardi B", "Megan Thee Stallion",
  "Doja Cat", "Jack Harlow", "A$AP Rocky", "Pusha T", "Denzel Curry", "JID",
  "Vince Staples", "Earl Sweatshirt", "MF DOOM", "Madvillain", "Kanye",
  // pop / current
  "Taylor Swift", "Beyoncé", "Rihanna", "Ariana Grande", "Billie Eilish",
  "Olivia Rodrigo", "Sabrina Carpenter", "Dua Lipa", "Adele", "Ed Sheeran",
  "Harry Styles", "Lady Gaga", "Katy Perry", "Bruno Mars", "Justin Bieber",
  "Miley Cyrus", "Selena Gomez", "Charli XCX", "Chappell Roan", "Gracie Abrams",
  "Lana Del Rey", "Lorde", "Halsey", "PinkPantheress", "Troye Sivan", "Tate McRae",
  // R&B / soul
  "Frank Ocean", "The Weeknd", "SZA", "Beyoncé", "Brent Faiyaz", "Daniel Caesar",
  "Solange", "Janelle Monáe", "Summer Walker", "Jhené Aiko", "H.E.R.", "Giveon",
  "Kehlani", "Usher", "Chris Brown", "Alicia Keys", "Lauryn Hill", "Erykah Badu",
  "D'Angelo", "Sade", "Amy Winehouse",
  // rock / alternative / indie
  "Arctic Monkeys", "Tame Impala", "The Strokes", "The White Stripes", "Red Hot Chili Peppers",
  "Foo Fighters", "Pearl Jam", "Soundgarden", "The Smashing Pumpkins", "Green Day",
  "Blink-182", "Paramore", "Fall Out Boy", "My Chemical Romance", "The 1975",
  "Vampire Weekend", "The National", "Bon Iver", "Fleet Foxes", "Sufjan Stevens",
  "Phoebe Bridgers", "Mitski", "boygenius", "Big Thief", "Wilco", "Beck",
  "Gorillaz", "Muse", "Coldplay", "U2", "R.E.M.", "Talking Heads", "The Cure",
  "Joy Division", "New Order", "The Smiths", "Pixies", "Pavement", "Sonic Youth",
  "Modest Mouse", "Interpol", "The Killers", "Kings of Leon", "Glass Animals",
  "Cage the Elephant", "Florence + the Machine",
  // shoegaze / dream pop / experimental
  "My Bloody Valentine", "Slowdive", "Cocteau Twins", "Beach House", "DIIV",
  "Deftones", "Radiohead",
  // electronic
  "Daft Punk", "Aphex Twin", "Burial", "Four Tet", "Jamie xx", "Disclosure",
  "Flume", "Kaytranada", "ODESZA", "Bonobo", "Caribou", "The Chemical Brothers",
  "Massive Attack", "Portishead", "Fred again..", "Skrillex", "Calvin Harris",
  // metal / heavier
  "Metallica", "Black Sabbath", "Slipknot", "Tool", "System of a Down", "Korn",
  "Rage Against the Machine", "Deftones", "Mastodon", "Gojira", "Spiritbox",
  "Turnstile", "Knocked Loose",
  // jazz / classic
  "Miles Davis", "John Coltrane", "Frank Sinatra", "Nina Simone", "Ella Fitzgerald",
  "Kamasi Washington", "BADBADNOTGOOD",
  // country / americana
  "Johnny Cash", "Morgan Wallen", "Zach Bryan", "Chris Stapleton", "Luke Combs",
  "Kacey Musgraves", "Tyler Childers", "Jelly Roll", "Post Malone",
  // latin / global
  "Bad Bunny", "Karol G", "Rosalía", "Peso Pluma", "Feid", "J Balvin", "Shakira",
  "Burna Boy", "Wizkid", "Tems", "Tyla", "Rema",
  // k-pop
  "BTS", "BLACKPINK", "Stray Kids", "SEVENTEEN", "NewJeans", "TWICE",
];

// name (lowercase) → rank index (lower = more popular).
export const POPULAR_RANK = new Map<string, number>(
  POPULAR_ARTISTS.map((name, i) => [name.toLowerCase(), i])
);
