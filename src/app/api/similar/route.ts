import { NextRequest, NextResponse } from "next/server";
import { GENRE_QUERIES } from "../spotify/genre/route";
import { isLikelyAI } from "@/lib/aiFilter";

const BAD = /\b(tribute|karaoke|made famous|in the style of|originally performed|cover version|covers of|string quartet|lullaby|piano versions?|instrumental|8-bit|performs|solo violin)\b/i;
const BAD_ARTIST = /various artists|karaoke|tribute|vitamin string|\bvsq\b|\bcover/i;

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  primaryGenreName?: string;
}

// iTunes' own genre tag for an artist/album, used as a fallback when MusicBrainz has no genre
async function itunesGenre(artist: string): Promise<string> {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=album&limit=1`,
      { next: { revalidate: 604800 } }
    );
    if (!r.ok) return "";
    return (await r.json()).results?.[0]?.primaryGenreName ?? "";
  } catch {
    return "";
  }
}

// Map a free-text genre/style to one of our curated genre keys
function matchGenreKey(g: string): string | null {
  const s = g.toLowerCase();
  if (/hip ?hop|cloud rap|drill|trap/.test(s)) return "Hip-Hop";
  if (/\brap\b/.test(s)) return "Rap";
  if (/shoegaze|dream pop/.test(s)) return "Shoegaze";
  if (/metal|hardcore|metalcore|deathcore|grindcore|sludge/.test(s)) return "Metal";
  if (/punk/.test(s)) return "Punk";
  if (/jazz/.test(s)) return "Jazz";
  if (/soul|funk|motown/.test(s)) return "Soul";
  if (/r&b|rhythm and blues|contemporary r/.test(s)) return "R&B";
  if (/electronic|techno|house|ambient|idm|edm|trip hop|dnb|garage/.test(s)) return "Electronic";
  if (/indie/.test(s)) return "Indie";
  if (/alternative|art rock|post-punk|post rock|noise rock|emo/.test(s)) return "Alternative";
  if (/grunge|hard rock|classic rock|\brock\b/.test(s)) return "Rock";
  if (/\bpop\b/.test(s)) return "Pop";
  if (/classical|orchestra|baroque|romantic|opera/.test(s)) return "Classical";
  if (/reggae|dub|ska|dancehall/.test(s)) return "Reggae";
  if (/blues/.test(s)) return "Blues";
  if (/latin|reggaeton|salsa|bachata|cumbia/.test(s)) return "Latin";
  if (/lo-?fi/.test(s)) return "Lo-Fi";
  return null;
}

async function lookup(term: string): Promise<ItunesAlbum | null> {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=3`,
      { next: { revalidate: 604800 } }
    );
    if (!r.ok) return null;
    const results: ItunesAlbum[] = (await r.json()).results ?? [];
    return results.find((a) =>
      a.collectionId && a.collectionName && a.artistName && a.artworkUrl100 &&
      !BAD.test(a.collectionName) && !BAD_ARTIST.test(a.artistName) &&
      !isLikelyAI(a.artistName, a.collectionName)
    ) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist") ?? "";
  const artistLc = artist.toLowerCase();
  const genre = req.nextUrl.searchParams.get("genre") ?? "";
  const exclude = req.nextUrl.searchParams.get("exclude") ?? "";
  if (!genre && !artist) return NextResponse.json([]);

  // Resolve the genre: passed value → iTunes primary genre → default
  let key = matchGenreKey(genre);
  if (!key && artist) key = matchGenreKey(await itunesGenre(artist));
  if (!key) key = "Rock";
  const genreQueries = [...(GENRE_QUERIES[key] ?? [])].sort(() => Math.random() - 0.5).slice(0, 16);

  // Recommend strictly from the album's genre (other artists)
  const genreAll = (await Promise.all(genreQueries.map(lookup))).filter(Boolean) as ItunesAlbum[];

  const isSameArtist = (a: ItunesAlbum) => {
    const n = (a.artistName ?? "").toLowerCase();
    return artistLc && (n.includes(artistLc) || artistLc.includes(n));
  };

  const toRec = (a: ItunesAlbum) => ({
    id: String(a.collectionId),
    title: a.collectionName!,
    artist: a.artistName!,
    artwork: a.artworkUrl100!.replace("100x100bb", "600x600bb"),
    year: a.releaseDate ? parseInt(a.releaseDate.slice(0, 4)) : null,
  });

  const seen = new Set<string>([exclude]);
  const out: ReturnType<typeof toRec>[] = [];
  for (const a of genreAll) {
    if (out.length >= 12) break;
    if (!a.collectionId || isSameArtist(a)) continue;
    const id = String(a.collectionId);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(toRec(a));
  }

  return NextResponse.json(out);
}
