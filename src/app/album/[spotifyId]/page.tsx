import { auth } from "@/lib/auth";
import { displayCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { getAlbum, isSpotifyId } from "@/lib/spotify";
import { getAlbumDescription } from "@/lib/wikipedia";
import { getAlbumMeta, formatReleaseDate, getBandMembers } from "@/lib/musicbrainz";
import { getTracklist, collectContributors, linkTracksToSpotify } from "@/lib/tracklist";
import Link from "next/link";
import AlbumClient from "./AlbumClient";
import RecentlyViewedTracker from "@/components/album/RecentlyViewedTracker";
import LogPanel from "./LogPanel";
import AlbumPlayButton from "./AlbumPlayButton";
import AlbumBackdrop from "./AlbumBackdrop";
import RatingBars from "./RatingBars";
import ListenListButton from "./ListenListButton";
import AddToCrate from "./AddToCrate";
import SendAlbum from "./SendAlbum";
import GenrePills from "./GenrePills";
import SimilarAlbums from "./SimilarAlbums";
import Discussion from "./Discussion";
import { RatingMeter } from "@/components/ui/RatingMeter";
import { unstable_cache } from "next/cache";
import { Suspense, ViewTransition, type ComponentProps } from "react";

export const dynamic = "force-dynamic";

// Some sources leak Discogs list/series names (e.g. "Discogs/The Most Popular
// Album Released Every Year From 1950 To 2020") in among real genre tags. These
// aren't genres — detect them so they can be shown as a note instead of a pill.
function isGenreNoise(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("discogs") ||
    t.includes("most popular") ||
    t.includes("every year") ||
    /\b(?:19|20)\d{2}\b[\s\S]*\b(?:19|20)\d{2}\b/.test(t) || // a year range
    s.length > 30 ||
    s.trim().split(/\s+/).length > 5
  );
}

function buildDescription(title: string, artist: string, year: number | null, trackCount: number, genres: string[]) {
  const parts: string[] = [];
  const by = artist ? ` by ${artist}` : "";
  parts.push(
    `${title} is ${year ? `a ${year}` : "an"} album${by}`
    + (genres.length ? `, rooted in ${genres.slice(0, 2).join(" and ")}` : "")
    + "."
  );
  if (trackCount > 0) parts.push(`It comprises ${trackCount} track${trackCount === 1 ? "" : "s"}.`);
  parts.push("Rate it, review it, and share what you think with the community below.");
  return parts.join(" ");
}

// Curated subgenre overrides for specific albums (when MusicBrainz tags miss them).
const SUBGENRE_OVERRIDES: Record<string, string[]> = {
  "metallica|masterofpuppets": ["Thrash Metal", "Speed Metal"],
};
function overrideKey(artist: string, title: string) {
  const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
  return `${n(artist)}|${n(title)}`;
}

// iTunes' own genre tag for an album, used so genre pills always appear.
async function itunesGenres(title: string, artist: string): Promise<string[]> {
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=1`,
      { next: { revalidate: 604800 }, signal: AbortSignal.timeout(2500) }
    );
    if (!r.ok) return [];
    const g = (await r.json()).results?.[0]?.primaryGenreName as string | undefined;
    if (!g) return [];
    return g.split("/").map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== "music");
  } catch {
    return [];
  }
}

async function getOembed(spotifyId: string): Promise<{ title: string | null; artwork: string | null }> {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/album/${spotifyId}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(2500) }
    );
    if (!res.ok) return { title: null, artwork: null };
    const d = await res.json();
    return { title: d.title ?? null, artwork: d.thumbnail_url ?? null };
  } catch {
    return { title: null, artwork: null };
  }
}

// iTunes tracklist, cached a week. For slug albums (no real Spotify ID) this is
// the source of the tracklist; it's streamed via <Suspense>, NOT awaited on the
// render path — so the page shell can flush before iTunes responds.
//
// iTunes gives us names and previews but no Spotify IDs, so a second pass looks
// the album up on Spotify and swaps each song's placeholder search link for the
// real track URL. Both the extra calls sit behind this same weekly cache.
type TrackItem = { name: string; duration_ms: number; track_number: number; preview_url: string | null; external_urls: { spotify: string } };
const getTracklistCached = unstable_cache(
  async (title: string, artist: string): Promise<TrackItem[]> =>
    linkTracksToSpotify(await getTracklist(title, artist), title, artist),
  ["album-tracklist-v2"],
  { revalidate: 604800 }
);

// SLOW enrichment — Wikipedia blurb + MusicBrainz meta/members + iTunes genre tag.
// MusicBrainz is rate-limited and makes sequential search→detail calls (~5s), so
// this is NOT awaited on the render path: it streams into <Suspense> boundaries
// behind fast fallbacks. Cached a week.
export type SlowEnrichment = { wiki: string | null; meta: Awaited<ReturnType<typeof getAlbumMeta>>; members: string[]; itGenres: string[] };
const getSlowEnrichment = unstable_cache(
  async (title: string, artist: string, year: number | null): Promise<SlowEnrichment> => {
    const [wiki, meta, members, itGenres] = await Promise.all([
      getAlbumDescription(title, artist),
      getAlbumMeta(title, artist),
      getBandMembers(artist, year),
      itunesGenres(title, artist),
    ]);
    return { wiki, meta, members, itGenres };
  },
  ["album-slow-enrichment-v2"],
  { revalidate: 604800 }
);

// ---- Streamed enrichment sections (render behind fast fallbacks in <Suspense>) ----

// Genre pills + Discogs-noise notes, upgraded with MusicBrainz genres/styles.
async function EnrichedGenres({ p, spotifyGenres, overrideGenres, spotifyId }: {
  p: Promise<SlowEnrichment>; spotifyGenres: string[]; overrideGenres: string[]; spotifyId: string;
}) {
  const { meta, itGenres } = await p;
  const rawGenres = meta?.genres.length ? meta.genres : spotifyGenres;
  const rawStyles = meta?.styles ?? [];
  const notes = [...new Set([...rawGenres, ...rawStyles].filter(isGenreNoise))];
  const dg = rawGenres.filter((s) => !isGenreNoise(s));
  const ds = rawStyles.filter((s) => !isGenreNoise(s));
  let pills = [...new Set([...dg, ...ds, ...overrideGenres])];
  if (pills.length === 0) pills = itGenres;
  return (
    <>
      <GenrePills genres={pills.slice(0, 8)} currentId={spotifyId} />
      {notes.length > 0 && (
        <div className="mb-3 space-y-1">
          {notes.map((note) => (
            <p key={note} className="text-xs text-[#6b6b6b] italic flex items-start gap-1.5">
              <span aria-hidden className="not-italic">📌</span>
              <a href={`https://www.discogs.com/search/?q=${encodeURIComponent(note.replace(/^discogs\s*\/\s*/i, ""))}&type=all`} target="_blank" rel="noopener noreferrer" className="hover:text-[#c4a832] hover:underline transition-colors">{note}</a>
            </p>
          ))}
        </div>
      )}
    </>
  );
}

// Album description: Wikipedia blurb when it resolves, else the generated fallback.
async function EnrichedDescription({ p, fallback }: { p: Promise<SlowEnrichment>; fallback: string }) {
  const { wiki } = await p;
  return <p className="text-sm text-[#bbbbbb] leading-relaxed mb-5">{wiki ?? fallback}</p>;
}

// MusicBrainz detail rows (genre, styles, release date, label).
async function EnrichedDetailRows({ p, spotifyGenres, year }: { p: Promise<SlowEnrichment>; spotifyGenres: string[]; year: number | null }) {
  const { meta } = await p;
  const dg = (meta?.genres.length ? meta.genres : spotifyGenres).filter((s) => !isGenreNoise(s));
  const ds = (meta?.styles ?? []).filter((s) => !isGenreNoise(s));
  const labels = meta?.labels ?? [];
  const releaseDateStr = formatReleaseDate(meta?.releaseDate ?? null) ?? (year ? String(year) : null);
  return (
    <>
      {dg.length > 0 && <div className="flex gap-2"><span className="text-[#6b6b6b] w-28 shrink-0">Genre</span><span className="text-[#d8d8d8]">{dg.join(", ")}</span></div>}
      {ds.length > 0 && <div className="flex gap-2"><span className="text-[#6b6b6b] w-28 shrink-0">Styles</span><span className="text-[#d8d8d8]">{ds.join(", ")}</span></div>}
      {releaseDateStr && <div className="flex gap-2"><span className="text-[#6b6b6b] w-28 shrink-0">Release date</span><span className="text-[#d8d8d8]">{releaseDateStr}</span></div>}
      {labels.length > 0 && <div className="flex gap-2"><span className="text-[#6b6b6b] w-28 shrink-0">Label</span><span className="text-[#d8d8d8]">{labels.join(", ")}</span></div>}
    </>
  );
}

// Band members (MusicBrainz).
async function EnrichedBandMembers({ p }: { p: Promise<SlowEnrichment> }) {
  const { members } = await p;
  if (members.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Band Members</p>
      <div className="flex flex-wrap gap-1.5">
        {members.map((name) => (
          <span key={name} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">{name}</span>
        ))}
      </div>
    </div>
  );
}

// ---- Streamed tracklist-dependent sections (fed by the iTunes tracks promise, so
// the shell flushes before iTunes responds) ----
type AlbumShape = ComponentProps<typeof AlbumClient>["album"];

async function AlbumTracklist({ tp, album, reviews, isLoggedIn }: {
  tp: Promise<TrackItem[]>; album: AlbumShape; reviews: ComponentProps<typeof AlbumClient>["reviews"]; isLoggedIn: boolean;
}) {
  const tracks = await tp;
  return <AlbumClient album={album} tracks={tracks} reviews={reviews} isLoggedIn={isLoggedIn} />;
}

async function AlbumContributors({ tp, artist }: { tp: Promise<TrackItem[]>; artist: string }) {
  const tracks = await tp;
  const contributors = collectContributors(tracks, artist);
  if (contributors.length <= 1) return null;
  return (
    <div className="mb-5">
      <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Contributors</p>
      <div className="flex flex-wrap gap-1.5">
        {contributors.map((name) => (
          <span key={name} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">{name}</span>
        ))}
      </div>
    </div>
  );
}

async function AlbumFeaturingRow({ tp }: { tp: Promise<TrackItem[]> }) {
  const tracks = await tp;
  const featured = new Set<string>();
  for (const t of tracks) {
    const m = t.name.match(/\(feat\.?\s([^)]+)\)/i) || t.name.match(/\(with\s([^)]+)\)/i);
    if (m) m[1].split(/,|&|\band\b/).forEach((n) => { const v = n.trim(); if (v) featured.add(v); });
  }
  const featuredArtists = [...featured];
  if (featuredArtists.length === 0) return null;
  return (
    <div className="flex gap-2">
      <span className="text-[#6b6b6b] w-28 shrink-0">Featuring</span>
      <span className="text-[#d8d8d8]">{featuredArtists.join(", ")}</span>
    </div>
  );
}

export default async function AlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ spotifyId: string }>;
  searchParams: Promise<{ title?: string; artist?: string; artwork?: string; year?: string; review?: string }>;
}) {
  const { spotifyId } = await params;
  const sp = await searchParams;
  const session = await auth();

  // The Spotify lookup and the DB read are independent — run them in parallel.
  const [spotifyAlbum, dbAlbum] = await Promise.all([
    getAlbum(spotifyId).catch(() => null),
    prisma.album.findUnique({
      where: { spotifyId },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            likes: { select: { value: true, userId: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  // Resolve metadata: Spotify API → DB → query params (from cards) → oEmbed (bare links)
  let title = spotifyAlbum?.name ?? dbAlbum?.title ?? sp.title ?? null;
  let artwork = spotifyAlbum?.images?.[0]?.url ?? dbAlbum?.artwork ?? sp.artwork ?? null;
  const artist = spotifyAlbum?.artists?.map((a) => a.name).join(", ") ?? dbAlbum?.artist ?? sp.artist ?? "";
  const year = spotifyAlbum?.release_date
    ? parseInt(spotifyAlbum.release_date)
    : dbAlbum?.year ?? (sp.year ? parseInt(sp.year) : null);
  const genres = spotifyAlbum?.genres ?? (dbAlbum?.genres ? JSON.parse(dbAlbum.genres) : []);
  const spotifyTracks: TrackItem[] = spotifyAlbum?.tracks?.items ?? [];
  const reviews = dbAlbum?.reviews ?? [];

  // Last-resort fallback for bare links (no API, no DB, no params).
  // Spotify's oEmbed only knows Spotify ids, so for an iTunes-sourced album this
  // was a second doomed round trip after the album lookup that just failed.
  if ((!title || !artwork) && isSpotifyId(spotifyId)) {
    const o = await getOembed(spotifyId);
    title = title ?? o.title;
    artwork = artwork ?? o.artwork;
  }
  title = title ?? "Unknown Album";

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const myReview = session
    ? reviews.find((r) => r.user.id === session.user.id) ?? null
    : null;

  const album = { spotifyId, title, artist, artwork, year, genres };
  const hasMeta = title !== "Unknown Album" && !!artist;

  // Tracklist promise — Spotify's tracks if present, else iTunes (streamed). Never
  // awaited on the render path, so the shell flushes before iTunes responds.
  const tracksPromise: Promise<TrackItem[]> = spotifyTracks.length > 0
    ? Promise.resolve(spotifyTracks)
    : hasMeta ? getTracklistCached(title, artist) : Promise.resolve([]);

  // Slow enrichment (Wikipedia + MusicBrainz + iTunes genre) — started but NOT
  // awaited; it streams into the <Suspense> boundaries below.
  const slow: Promise<SlowEnrichment> = hasMeta
    ? getSlowEnrichment(title, artist, year)
    : Promise.resolve({ wiki: null, meta: null, members: [], itGenres: [] });

  const overrideGenres = SUBGENRE_OVERRIDES[overrideKey(artist, title)] ?? [];
  // Fast fallbacks rendered immediately; the streamed components upgrade them.
  const spotifyGenres = genres as string[];
  const fastGenreList = spotifyGenres.filter((s) => !isGenreNoise(s));
  const fastPills = [...new Set([...fastGenreList, ...overrideGenres])];
  const fastDescription = buildDescription(title, artist, year, spotifyTracks.length, spotifyGenres);
  const fastReleaseDateStr = year ? String(year) : null;
  const similarGenre = fastGenreList[0] ?? fastPills[0];

  // Primary performing artists (fast — from the artist string).
  const primaryArtists = artist.split(", ").filter(Boolean);
  // Everyone credited, for the byline: the artist string plus any guest who is
  // named only in the title.
  const credits = displayCredits(artist, title);
  // LogPanel stays in the shell (so the review CTA is instant); its song picker
  // uses Spotify's track names when present (empty for slug albums, where the
  // full tracklist streams into <AlbumClient> below).
  const spotifyTrackNames = spotifyTracks.map((t) => t.name);
  const initialReview = myReview ? {
    rating: myReview.rating,
    subject: myReview.subject ?? null,
    body: myReview.body ?? null,
    favoriteSong: myReview.favoriteSong ?? null,
    leastFavoriteSong: myReview.leastFavoriteSong ?? null,
    showSongs: myReview.showSongs,
  } : null;

  const reviewsForClient = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    subject: r.subject ?? null,
    body: r.body ?? null,
    favoriteSong: r.favoriteSong ?? null,
    leastFavoriteSong: r.leastFavoriteSong ?? null,
    showSongs: r.showSongs,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
    album: { spotifyId, title, artist, artwork: artwork ?? null },
    likeCount: r.likes.filter((l) => l.value === 1).length,
    dislikeCount: r.likes.filter((l) => l.value === -1).length,
    myVote: session ? (r.likes.find((l) => l.userId === session.user.id)?.value ?? 0) : 0,
  }));

  return (
    <>
      <RecentlyViewedTracker spotifyId={spotifyId} title={title} artist={artist} artwork={artwork ?? null} year={year} />
      {artwork && <AlbumBackdrop artwork={artwork} />}
      <div className="max-w-4xl mx-auto px-5 py-12 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <Link href="/search" transitionTypes={["nav-back"]} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
          ← Back to search
        </Link>
        <SendAlbum
          album={{ spotifyId, title, artist, artwork: artwork ?? null }}
          isLoggedIn={!!session}
          review={myReview ? {
            rating: myReview.rating,
            subject: myReview.subject ?? null,
            body: myReview.body ?? null,
            username: myReview.user.username,
          } : null}
          avgRating={avgRating}
          reviewCount={reviews.length}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-7 mb-10">
        <div className="sm:col-span-1">
          <div className="relative group/cover">
            {artwork ? (
              // Receives the morph from whichever card was tapped to get here.
              <ViewTransition name={`album-cover-${spotifyId}`} share="album-cover">
                <img src={artwork} alt={title} className="w-full rounded-xl shadow-xl aspect-square object-cover" />
              </ViewTransition>
            ) : (
              <div className="w-full aspect-square rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e2e2e" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="9" />
                </svg>
              </div>
            )}
            {/* Play the album on YouTube — hover on desktop, tap (with warning) on touch */}
            <AlbumPlayButton
              youtubeUrl={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title} full album`)}`}
              title={title}
            />
          </div>
          {/* Desktop: actions live under the cover. On mobile they move between
              Contributors and the rating distribution (rendered further down). */}
          <div className="hidden sm:block">
            <div className="mt-4">
              <LogPanel
                album={album}
                trackNames={spotifyTrackNames}
                initialReview={initialReview}
                isLoggedIn={!!session}
                autoOpenReview={sp.review === "1"}
              />
            </div>
            <ListenListButton
              spotifyId={spotifyId}
              title={title}
              artist={artist}
              artwork={artwork ?? null}
              year={year ?? null}
            />
            <div className="mt-2">
              <AddToCrate album={album} isLoggedIn={!!session} />
            </div>
          </div>
        </div>

        <div>
          <h1 className="font-serif text-3xl  text-[#f0f0f0] leading-tight mb-1">{title}</h1>
          <p className="text-base mb-1">
            {/* Every credited artist links to their own page, including a guest
                named only in the title — "My Life (feat. Tame Impala)" credits
                Tame Impala, who otherwise appeared nowhere on this release. */}
            {credits.length ? credits.map((name, i) => (
              <span key={name}>
                {i > 0 && <span className="text-[#6b6b6b]">, </span>}
                <Link
                  href={`/artist/${encodeURIComponent(name)}`}
                  className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors"
                >
                  {name}
                </Link>
              </span>
            )) : (
              <span className="text-[#a0a0a0]">{artist}</span>
            )}
          </p>
          {year && <p className="text-sm text-[#6b6b6b] mb-3">{year}</p>}

          <Suspense fallback={<GenrePills genres={fastPills.slice(0, 8)} currentId={spotifyId} />}>
            <EnrichedGenres p={slow} spotifyGenres={spotifyGenres} overrideGenres={overrideGenres} spotifyId={spotifyId} />
          </Suspense>

          {avgRating != null && (
            <div className="mb-4 max-w-[220px]">
              <RatingMeter value={Math.round(avgRating * 2) / 2} size="lg" />
              <p className="text-xs text-[#6b6b6b] mt-1">
                avg from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          )}

          {/* Description */}
          <Suspense fallback={<p className="text-sm text-[#bbbbbb] leading-relaxed mb-5">{fastDescription}</p>}>
            <EnrichedDescription p={slow} fallback={fastDescription} />
          </Suspense>

          {/* Details & credits */}
          <div className="mb-5">
            <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Details</p>
            <div className="space-y-1 text-sm">
              <Suspense fallback={fastReleaseDateStr ? (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Release date</span>
                  <span className="text-[#d8d8d8]">{fastReleaseDateStr}</span>
                </div>
              ) : null}>
                <EnrichedDetailRows p={slow} spotifyGenres={spotifyGenres} year={year} />
              </Suspense>
              {primaryArtists.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Performed by</span>
                  <span className="text-[#d8d8d8]">{primaryArtists.join(", ")}</span>
                </div>
              )}
              <Suspense fallback={null}>
                <AlbumFeaturingRow tp={tracksPromise} />
              </Suspense>
            </div>
          </div>

          {/* Band members (streams in from MusicBrainz) */}
          <Suspense fallback={null}>
            <EnrichedBandMembers p={slow} />
          </Suspense>

          {/* Contributors (streams in with the tracklist) */}
          <Suspense fallback={null}>
            <AlbumContributors tp={tracksPromise} artist={artist} />
          </Suspense>

        </div>
      </div>

      {/* Mobile only — actions sit between Contributors and the rating distribution */}
      <div className="sm:hidden mb-8 space-y-2">
        <LogPanel
          album={album}
          trackNames={spotifyTrackNames}
          initialReview={initialReview}
          isLoggedIn={!!session}
          autoOpenReview={sp.review === "1"}
        />
        <ListenListButton
          spotifyId={spotifyId}
          title={title}
          artist={artist}
          artwork={artwork ?? null}
          year={year ?? null}
        />
        <AddToCrate album={album} isLoggedIn={!!session} />
      </div>

      {/* Average rating distribution — between the credits and the tracklist */}
      <RatingBars ratings={reviews.map((r) => r.rating)} />

      <Suspense fallback={<div className="mt-6 h-40 rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />}>
        <AlbumTracklist tp={tracksPromise} album={album} reviews={reviewsForClient} isLoggedIn={!!session} />
      </Suspense>

      <div id="discussion" className="mt-6 scroll-mt-20">
        <Discussion album={album} isLoggedIn={!!session} />
      </div>

      <SimilarAlbums
        artist={artist}
        genre={similarGenre}
        excludeId={spotifyId}
      />

      {/* Attribution for the catalogue data on this page (guideline 5.2.1). */}
      <p className="mt-8 pt-4 border-t border-[#1f1f1f] text-[11px] text-[#6b6b6b] leading-relaxed">
        Album metadata and artwork provided by Apple Music, Spotify, and MusicBrainz, and remain the
        property of their respective rights holders. SETLST is an independent app and is not
        affiliated with or endorsed by them.{" "}
        <Link href="/copyright" className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors">
          Copyright &amp; attribution
        </Link>
      </p>
      </div>
    </>
  );
}
