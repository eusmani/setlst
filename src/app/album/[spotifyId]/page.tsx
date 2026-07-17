import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAlbum } from "@/lib/spotify";
import { getAlbumDescription } from "@/lib/wikipedia";
import { getAlbumMeta, formatReleaseDate, getBandMembers } from "@/lib/musicbrainz";
import { getTracklist, collectContributors } from "@/lib/tracklist";
import Link from "next/link";
import AlbumClient from "./AlbumClient";
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
      { next: { revalidate: 604800 } }
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
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { title: null, artwork: null };
    const d = await res.json();
    return { title: d.title ?? null, artwork: d.thumbnail_url ?? null };
  } catch {
    return { title: null, artwork: null };
  }
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

  let spotifyAlbum = null;
  try { spotifyAlbum = await getAlbum(spotifyId); } catch {}

  const dbAlbum = await prisma.album.findUnique({
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
  });

  // Resolve metadata: Spotify API → DB → query params (from cards) → oEmbed (bare links)
  let title = spotifyAlbum?.name ?? dbAlbum?.title ?? sp.title ?? null;
  let artwork = spotifyAlbum?.images?.[0]?.url ?? dbAlbum?.artwork ?? sp.artwork ?? null;
  const artist = spotifyAlbum?.artists?.map((a) => a.name).join(", ") ?? dbAlbum?.artist ?? sp.artist ?? "";
  const year = spotifyAlbum?.release_date
    ? parseInt(spotifyAlbum.release_date)
    : dbAlbum?.year ?? (sp.year ? parseInt(sp.year) : null);
  const genres = spotifyAlbum?.genres ?? (dbAlbum?.genres ? JSON.parse(dbAlbum.genres) : []);
  let tracks: { name: string; duration_ms: number; track_number: number; preview_url: string | null; external_urls: { spotify: string } }[] =
    spotifyAlbum?.tracks?.items ?? [];
  const reviews = dbAlbum?.reviews ?? [];

  // Last-resort fallback for bare links (no API, no DB, no params)
  if (!title || !artwork) {
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

  // Tracklist: Spotify (when available) → iTunes (works server-side, with 30s previews)
  if (tracks.length === 0 && title !== "Unknown Album" && artist) {
    tracks = await getTracklist(title, artist);
  }

  const album = { spotifyId, title, artist, artwork, year, genres };

  let description = buildDescription(title, artist, year, tracks.length, genres as string[]);
  let meta = null;
  let bandMembers: string[] = [];
  if (title !== "Unknown Album" && artist) {
    const [wiki, mbMeta, members] = await Promise.all([
      getAlbumDescription(title, artist),
      getAlbumMeta(title, artist),
      getBandMembers(artist, year),
    ]);
    if (wiki) description = wiki;
    meta = mbMeta;
    bandMembers = members;
  }

  const rawDisplayGenres = (meta?.genres.length ? meta.genres : (genres as string[]));
  const rawStyles = meta?.styles ?? [];
  // Pull out non-genre noise (Discogs lists, etc.) to show as a note instead.
  const genreNotes = [...new Set([...(rawDisplayGenres as string[]), ...rawStyles].filter(isGenreNoise))];
  const displayGenres = (rawDisplayGenres as string[]).filter((s) => !isGenreNoise(s));
  const displayStyles = (rawStyles as string[]).filter((s) => !isGenreNoise(s));

  // Genre pills: broad genres + subgenres/styles + any curated overrides (deduped); fall back to iTunes' genre tag.
  const overrideGenres = SUBGENRE_OVERRIDES[overrideKey(artist, title)] ?? [];
  let pillGenres = [...new Set([...(displayGenres as string[]), ...displayStyles, ...overrideGenres])];
  if (pillGenres.length === 0 && title !== "Unknown Album" && artist) {
    pillGenres = await itunesGenres(title, artist);
  }
  const displayLabels = meta?.labels ?? [];
  const releaseDateStr = formatReleaseDate(meta?.releaseDate ?? null) ?? (year ? String(year) : null);

  // Writing credits: primary artists + any featured artists parsed from track titles
  const primaryArtists = artist.split(", ").filter(Boolean);
  const featured = new Set<string>();
  for (const t of tracks) {
    const m = t.name.match(/\(feat\.?\s([^)]+)\)/i) || t.name.match(/\(with\s([^)]+)\)/i);
    if (m) m[1].split(/,|&|\band\b/).forEach((n) => { const v = n.trim(); if (v) featured.add(v); });
  }
  const featuredArtists = [...featured];

  // All performing contributors aggregated from the tracklist
  const contributors = collectContributors(tracks, artist);

  const trackNames = tracks.map((t) => t.name);

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
      {artwork && <AlbumBackdrop artwork={artwork} />}
      <div className="max-w-4xl mx-auto px-5 py-12 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <Link href="/search" transitionTypes={["nav-back"]} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
          ← Back to search
        </Link>
        <SendAlbum album={{ spotifyId, title, artist, artwork: artwork ?? null }} isLoggedIn={!!session} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-7 mb-10">
        <div className="sm:col-span-1">
          <div className="relative group/cover">
            {artwork ? (
              <img src={artwork} alt={title} className="w-full rounded-xl shadow-xl aspect-square object-cover" />
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
                trackNames={trackNames}
                initialReview={myReview ? {
                  rating: myReview.rating,
                  subject: myReview.subject ?? null,
                  body: myReview.body ?? null,
                  favoriteSong: myReview.favoriteSong ?? null,
                  leastFavoriteSong: myReview.leastFavoriteSong ?? null,
                  showSongs: myReview.showSongs,
                } : null}
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
            {artist ? (
              <Link
                href={`/artist/${encodeURIComponent(artist)}`}
                className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors"
              >
                {artist}
              </Link>
            ) : (
              <span className="text-[#a0a0a0]">{artist}</span>
            )}
          </p>
          {year && <p className="text-sm text-[#6b6b6b] mb-3">{year}</p>}

          <GenrePills genres={pillGenres.slice(0, 8)} currentId={spotifyId} />

          {genreNotes.length > 0 && (
            <div className="mb-3 space-y-1">
              {genreNotes.map((note) => (
                <p key={note} className="text-xs text-[#6b6b6b] italic flex items-start gap-1.5">
                  <span aria-hidden className="not-italic">📌</span>
                  <a
                    href={`https://www.discogs.com/search/?q=${encodeURIComponent(note.replace(/^discogs\s*\/\s*/i, ""))}&type=all`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#c4a832] hover:underline transition-colors"
                  >
                    {note}
                  </a>
                </p>
              ))}
            </div>
          )}

          {avgRating != null && (
            <div className="mb-4 max-w-[220px]">
              <RatingMeter value={Math.round(avgRating * 2) / 2} size="lg" />
              <p className="text-xs text-[#6b6b6b] mt-1">
                avg from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-[#bbbbbb] leading-relaxed mb-5">{description}</p>

          {/* Details & credits */}
          <div className="mb-5">
            <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Details</p>
            <div className="space-y-1 text-sm">
              {displayGenres.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Genre</span>
                  <span className="text-[#d8d8d8]">{displayGenres.join(", ")}</span>
                </div>
              )}
              {displayStyles.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Styles</span>
                  <span className="text-[#d8d8d8]">{displayStyles.join(", ")}</span>
                </div>
              )}
              {releaseDateStr && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Release date</span>
                  <span className="text-[#d8d8d8]">{releaseDateStr}</span>
                </div>
              )}
              {displayLabels.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Label</span>
                  <span className="text-[#d8d8d8]">{displayLabels.join(", ")}</span>
                </div>
              )}
              {primaryArtists.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Performed by</span>
                  <span className="text-[#d8d8d8]">{primaryArtists.join(", ")}</span>
                </div>
              )}
              {featuredArtists.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#6b6b6b] w-28 shrink-0">Featuring</span>
                  <span className="text-[#d8d8d8]">{featuredArtists.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Band members */}
          {bandMembers.length > 0 && (
            <div className="mb-5">
              <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Band Members</p>
              <div className="flex flex-wrap gap-1.5">
                {bandMembers.map((name) => (
                  <span key={name} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contributors */}
          {contributors.length > 1 && (
            <div className="mb-5">
              <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">Contributors</p>
              <div className="flex flex-wrap gap-1.5">
                {contributors.map((name) => (
                  <span key={name} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile only — actions sit between Contributors and the rating distribution */}
      <div className="sm:hidden mb-8 space-y-2">
        <LogPanel
          album={album}
          trackNames={trackNames}
          initialReview={myReview ? {
            rating: myReview.rating,
            subject: myReview.subject ?? null,
            body: myReview.body ?? null,
            favoriteSong: myReview.favoriteSong ?? null,
            leastFavoriteSong: myReview.leastFavoriteSong ?? null,
            showSongs: myReview.showSongs,
          } : null}
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

      <AlbumClient
        album={album}
        tracks={tracks}
        reviews={reviewsForClient}
        isLoggedIn={!!session}
      />

      <div id="discussion" className="mt-6 scroll-mt-20">
        <Discussion album={album} isLoggedIn={!!session} />
      </div>

      <SimilarAlbums
        artist={artist}
        genre={displayStyles[0] ?? displayGenres[0]}
        excludeId={spotifyId}
      />
      </div>
    </>
  );
}
