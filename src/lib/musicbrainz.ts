// Structured album metadata from MusicBrainz (free, open).
const UA = "SETLST/1.0 (music review app; contact: setlst@example.com)";
const REVALIDATE = 604800; // 1 week

export interface AlbumMeta {
  releaseDate: string | null;  // YYYY-MM-DD or YYYY
  labels: string[];
  genres: string[];            // broad genres
  styles: string[];            // finer styles
}

const BROAD = new Set([
  "hip hop", "rap", "rock", "pop", "jazz", "soul", "r&b", "rhythm and blues",
  "metal", "punk", "electronic", "folk", "country", "blues", "reggae",
  "classical", "funk", "indie", "ambient", "house", "techno", "disco",
]);

// Keep only tags that read like genres/subgenres (filters out "seen live", years, moods, etc.)
const GENRE_HINT = /(rock|metal|core|gaze|wave|punk|rap|hip ?hop|trap|\bpop\b|jazz|soul|funk|house|techno|ambient|folk|country|blues|reggae|emo|indie|grunge|drone|noise|dream|garage|ska|dub|drill|disco|electro|idm|industrial|hardcore|screamo|shoegaze|post-|prog|psych|grime|r&b|rhythm and blues|classical|orchestral|baroque|experimental|alternative|underground|west coast|east coast|southern|conscious|boom bap|g-funk|crunk|lo-?fi|new wave|synth)/i;

async function mb(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://musicbrainz.org/ws/2/${path}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: REVALIDATE },
      // MusicBrainz is rate-limited and often slow; it's only enrichment (genres,
      // members), so never let it block the album render for more than ~2.5s.
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MemberRel {
  type?: string;
  direction?: string;
  begin?: string | null;
  end?: string | null;
  artist?: { name?: string };
}

// Band lineup for a group artist, optionally narrowed to those active in `year`.
export async function getBandMembers(artist: string, year: number | null): Promise<string[]> {
  // 1. Find the artist and confirm it's a group
  const search = await mb(`artist?query=${encodeURIComponent(`artist:"${artist}"`)}&fmt=json&limit=1`);
  const found = (search?.artists as { id?: string; type?: string; name?: string }[] | undefined)?.[0];
  if (!found?.id || found.type !== "Group") return [];

  // 2. Fetch member relationships
  const detail = await mb(`artist/${found.id}?inc=artist-rels&fmt=json`);
  const rels = (detail?.relations as MemberRel[] | undefined) ?? [];

  // Dedupe by member name, keeping the widest active range
  const byName = new Map<string, { begin: number | null; end: number | null }>();
  for (const r of rels) {
    if (r.type !== "member of band") continue;
    const name = r.artist?.name;
    if (!name) continue;
    const begin = r.begin ? parseInt(r.begin.slice(0, 4)) : null;
    const end = r.end ? parseInt(r.end.slice(0, 4)) : null;
    const prev = byName.get(name);
    if (!prev) byName.set(name, { begin, end });
    else byName.set(name, {
      begin: prev.begin == null || begin == null ? null : Math.min(prev.begin, begin),
      end: prev.end == null || end == null ? null : Math.max(prev.end, end),
    });
  }

  let members = [...byName.entries()];
  // Narrow to lineup active during the album year when dates are available
  if (year) {
    const active = members.filter(([, r]) =>
      (r.begin == null || r.begin <= year) && (r.end == null || r.end >= year)
    );
    if (active.length >= 2) members = active;
  }

  return members.map(([name]) => name).slice(0, 12);
}

export async function getAlbumMeta(title: string, artist: string): Promise<AlbumMeta | null> {
  const q = encodeURIComponent(`artist:"${artist}" AND releasegroup:"${title}"`);
  const search = await mb(`release-group?query=${q}&fmt=json&limit=1`);
  const rg = (search?.["release-groups"] as { id?: string; "first-release-date"?: string }[] | undefined)?.[0];
  if (!rg?.id) return null;

  const id = rg.id;
  const releaseDate = rg["first-release-date"] || null;

  // Genres / styles — combine MusicBrainz genres with community tags (richer subgenres).
  const detail = await mb(`release-group/${id}?inc=genres+tags&fmt=json`);
  const rawGenres = ((detail?.genres as { name: string }[] | undefined) ?? []).map((g) => g.name);
  // Tags include subgenres like "thrash metal", "alternative rock", "conscious hip hop".
  const rawTags = ((detail?.tags as { name: string; count?: number }[] | undefined) ?? [])
    .filter((t) => (t.count ?? 0) >= 1 && GENRE_HINT.test(t.name))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map((t) => t.name);

  const genres: string[] = [];
  const styles: string[] = [];
  const seen = new Set<string>();
  for (const g of [...rawGenres, ...rawTags]) {
    const key = g.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    if (BROAD.has(key)) genres.push(titleCase(g));
    else styles.push(titleCase(g));
  }

  // Label (from a release in the group)
  const rel = await mb(`release?release-group=${id}&inc=labels&fmt=json&limit=1`);
  const release = (rel?.releases as { date?: string; "label-info"?: { label?: { name?: string } }[] }[] | undefined)?.[0];
  const labels = (release?.["label-info"] ?? [])
    .map((li) => li.label?.name)
    .filter((n): n is string => !!n);

  return {
    releaseDate: releaseDate || release?.date || null,
    labels: [...new Set(labels)],
    genres: [...new Set(genres)],
    styles: [...new Set(styles)],
  };
}

export function formatReleaseDate(d: string | null): string | null {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length === 3) {
    const date = new Date(`${d}T00:00:00`);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  return parts[0]; // just the year
}
