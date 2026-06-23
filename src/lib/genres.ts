// Music genre taxonomy — top-level genres mapped to their subgenres.
// Used for the browsable genre list and the /genre/[name] pages.
export const GENRE_TAXONOMY: Record<string, string[]> = {
  "Hip-Hop": [
    "Trap", "Drill", "UK Drill", "Cloud Rap", "Boom Bap", "Conscious Hip Hop",
    "Gangsta Rap", "Jazz Rap", "Lo-Fi Hip Hop", "Alternative Hip Hop",
    "Southern Hip Hop", "West Coast Hip Hop", "East Coast Hip Hop", "Dirty South",
    "Crunk", "G-Funk", "Mumble Rap", "Emo Rap", "Phonk", "Grime", "Hyphy",
    "Horrorcore", "Abstract Hip Hop", "Political Hip Hop", "Hardcore Hip Hop",
    "Trap Soul", "Plugg",
  ],
  "Rap": [
    "Pop Rap", "Melodic Rap", "Underground Hip Hop", "Battle Rap", "French Rap",
    "German Hip Hop", "Brazilian Hip Hop", "Canadian Hip Hop", "Trap Latino",
    "Old School Hip Hop", "Chopper", "Christian Hip Hop",
  ],
  "R&B": [
    "Contemporary R&B", "Neo Soul", "Alternative R&B", "Quiet Storm",
    "New Jack Swing", "Indie R&B", "PBR&B", "Funk", "Soul",
  ],
  "Rock": [
    "Classic Rock", "Hard Rock", "Alternative Rock", "Indie Rock", "Punk Rock",
    "Garage Rock", "Psychedelic Rock", "Progressive Rock", "Glam Rock", "Art Rock",
    "Post-Rock", "Math Rock", "Surf Rock", "Southern Rock", "Blues Rock",
    "Folk Rock", "Stoner Rock", "Grunge", "Britpop", "Post-Punk", "New Wave",
    "Krautrock", "Noise Rock", "Soft Rock", "Arena Rock",
  ],
  "Alternative": [
    "Alternative Rock", "Indie Rock", "Emo", "Midwest Emo", "Post-Punk",
    "Shoegaze", "Dream Pop", "Slacker Rock", "Math Rock", "Post-Hardcore",
    "Grunge", "Britpop", "Indie Pop", "Jangle Pop", "Noise Pop", "Art Pop",
  ],
  "Indie": [
    "Indie Rock", "Indie Pop", "Indie Folk", "Bedroom Pop", "Dream Pop",
    "Lo-Fi Indie", "Twee Pop", "Chamber Pop", "Indietronica", "Slowcore",
    "Jangle Pop", "Freak Folk", "Folk Pop",
  ],
  "Metal": [
    "Heavy Metal", "Thrash Metal", "Speed Metal", "Death Metal", "Black Metal",
    "Doom Metal", "Power Metal", "Progressive Metal", "Nu Metal", "Metalcore",
    "Deathcore", "Grindcore", "Sludge Metal", "Groove Metal", "Symphonic Metal",
    "Folk Metal", "Djent", "Melodic Death Metal", "Industrial Metal", "Glam Metal",
    "Post-Metal", "Gothic Metal", "Blackgaze", "Mathcore",
  ],
  "Jazz": [
    "Bebop", "Swing", "Cool Jazz", "Hard Bop", "Free Jazz", "Jazz Fusion",
    "Smooth Jazz", "Modal Jazz", "Latin Jazz", "Acid Jazz", "Nu Jazz",
    "Gypsy Jazz", "Dixieland", "Big Band", "Vocal Jazz", "Jazz Funk",
    "Spiritual Jazz", "Bossa Nova",
  ],
  "Soul": [
    "Neo Soul", "Motown", "Northern Soul", "Southern Soul", "Funk",
    "Blue-Eyed Soul", "Psychedelic Soul", "Gospel", "Deep Soul", "Quiet Storm",
  ],
  "Electronic": [
    "House", "Techno", "Trance", "Dubstep", "Drum and Bass", "EDM", "IDM",
    "Ambient", "Downtempo", "Synthwave", "Electro", "Breakbeat", "Jungle",
    "UK Garage", "Future Bass", "Electro House", "Deep House", "Tech House",
    "Progressive House", "Tropical House", "Hardstyle", "Glitch", "Vaporwave",
    "Chillwave", "Electronica", "Big Beat", "Trip Hop", "Drumstep", "Hardcore Techno",
    "Minimal Techno", "Acid House", "Gabber", "Psytrance", "Trip-Hop",
  ],
  "Pop": [
    "Dance Pop", "Electropop", "Synth-Pop", "Indie Pop", "Art Pop", "Dream Pop",
    "Bubblegum Pop", "Teen Pop", "Power Pop", "K-Pop", "J-Pop", "Hyperpop",
    "Baroque Pop", "Chamber Pop", "Sophisti-Pop", "Europop", "Pop Rock",
    "Bedroom Pop", "City Pop", "Pop Punk",
  ],
  "Classical": [
    "Baroque", "Romantic", "Classical Era", "Modern Classical",
    "Contemporary Classical", "Minimalism", "Opera", "Impressionism",
    "Neoclassicism", "Early Music", "Medieval", "Renaissance", "Chamber Music",
    "Orchestral", "Choral", "Post-Romantic",
  ],
  "Reggae": [
    "Roots Reggae", "Dancehall", "Dub", "Ska", "Rocksteady", "Lovers Rock",
    "Reggae Fusion", "Ragga", "Dub Poetry", "Ska Punk", "Reggaeton",
  ],
  "Latin": [
    "Reggaeton", "Salsa", "Bachata", "Merengue", "Cumbia", "Latin Pop",
    "Latin Trap", "Mariachi", "Ranchera", "Bossa Nova", "Samba", "Tango",
    "Banda", "Norteño", "Regional Mexican", "MPB", "Latin Rock", "Tropical",
    "Corrido",
  ],
  "Blues": [
    "Delta Blues", "Chicago Blues", "Electric Blues", "Country Blues",
    "Jump Blues", "Blues Rock", "Rhythm and Blues", "Soul Blues", "Texas Blues",
    "Piedmont Blues", "Boogie-Woogie",
  ],
  "Punk": [
    "Hardcore Punk", "Pop Punk", "Post-Punk", "Skate Punk", "Ska Punk", "Emo",
    "Anarcho-Punk", "Garage Punk", "Crust Punk", "Oi!", "Riot Grrrl",
    "Post-Hardcore", "Melodic Hardcore", "Folk Punk", "Egg Punk",
  ],
  "Shoegaze": [
    "Dream Pop", "Nu Gaze", "Blackgaze", "Noise Pop", "Slowcore", "Ethereal Wave",
  ],
  "Lo-Fi": [
    "Lo-Fi Hip Hop", "Lo-Fi Beats", "Chillhop", "Bedroom Pop", "Lo-Fi Indie",
    "Jazzhop",
  ],
  "Country": [
    "Outlaw Country", "Country Pop", "Bluegrass", "Alt-Country", "Americana",
    "Honky Tonk", "Country Rock", "Nashville Sound", "Bro-Country", "Western Swing",
  ],
  "Folk": [
    "Indie Folk", "Folk Rock", "Freak Folk", "Singer-Songwriter", "Contemporary Folk",
    "Traditional Folk", "Folk Pop", "Anti-Folk", "Celtic",
  ],
};

// Flat, de-duplicated, sorted list of every subgenre in the taxonomy.
export const ALL_SUBGENRES: string[] = [...new Set(
  Object.values(GENRE_TAXONOMY).flat()
)].sort((a, b) => a.localeCompare(b));

export const TOP_GENRES = Object.keys(GENRE_TAXONOMY);
