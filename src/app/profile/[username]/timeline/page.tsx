import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseGenres(raw: string | null): string[] {
  if (!raw) return [];
  try { const g = JSON.parse(raw); return Array.isArray(g) ? g.filter((x) => typeof x === "string") : []; } catch { return []; }
}

function albumHref(a: { spotifyId: string; title: string; artist: string; artwork: string | null }) {
  return `/album/${a.spotifyId}?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}` +
    (a.artwork ? `&artwork=${encodeURIComponent(a.artwork)}` : "");
}

export default async function TimelinePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, createdAt: true } });
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">User not found.</p>
        <Link href="/" className="text-sm text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      rating: true, createdAt: true,
      album: { select: { spotifyId: true, title: true, artist: true, artwork: true, year: true, genres: true } },
    },
  });

  // Track the first time this user reviewed each artist → "discovered" that year.
  const artistFirstSeen = new Map<string, number>();
  for (const r of reviews) {
    const key = r.album.artist.toLowerCase();
    const yr = r.createdAt.getFullYear();
    if (!artistFirstSeen.has(key) || yr < artistFirstSeen.get(key)!) artistFirstSeen.set(key, yr);
  }

  interface YearData {
    year: number;
    count: number;
    ratingSum: number;
    genres: Map<string, number>;
    monthly: number[];
    standout: { spotifyId: string; title: string; artist: string; artwork: string | null; rating: number } | null;
    discovered: Set<string>;
  }
  const byYear = new Map<number, YearData>();

  for (const r of reviews) {
    const yr = r.createdAt.getFullYear();
    let d = byYear.get(yr);
    if (!d) { d = { year: yr, count: 0, ratingSum: 0, genres: new Map(), monthly: Array(12).fill(0), standout: null, discovered: new Set() }; byYear.set(yr, d); }
    d.count++;
    d.ratingSum += r.rating;
    d.monthly[r.createdAt.getMonth()]++;
    for (const g of parseGenres(r.album.genres)) d.genres.set(g, (d.genres.get(g) ?? 0) + 1);
    if (!d.standout || r.rating > d.standout.rating) {
      d.standout = { spotifyId: r.album.spotifyId, title: r.album.title, artist: r.album.artist, artwork: r.album.artwork, rating: r.rating };
    }
    // New artist discovered this year?
    if (artistFirstSeen.get(r.album.artist.toLowerCase()) === yr) d.discovered.add(r.album.artist);
  }

  const years = [...byYear.values()].sort((a, b) => b.year - a.year);

  // All-time headline stats
  const totalAlbums = reviews.length;
  const totalArtists = artistFirstSeen.size;
  const allGenres = new Map<string, number>();
  for (const d of byYear.values()) for (const [g, n] of d.genres) allGenres.set(g, (allGenres.get(g) ?? 0) + n);
  const topGenre = [...allGenres.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const memberYear = user.createdAt.getFullYear();

  const Stat = ({ v, l }: { v: string | number; l: string }) => (
    <div className="text-center">
      <p className="text-2xl text-[#f0f0f0] font-bold tabular-nums">{v}</p>
      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mt-0.5">{l}</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-16">
      <Link href={`/profile/${username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← {username}</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-2 mb-1">Music Archive</h1>
      <p className="text-sm text-[#a0a0a0] mb-6">A living timeline of {username}&apos;s music taste — it grows with every album logged.</p>

      {totalAlbums === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-1">No history yet.</p>
          <p className="text-xs">Log some albums and this archive will start filling in.</p>
        </div>
      ) : (
        <>
          {/* All-time headline */}
          <div className="grid grid-cols-4 gap-2 bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 mb-8">
            <Stat v={totalAlbums} l="Albums" />
            <Stat v={totalArtists} l="Artists" />
            <Stat v={topGenre} l="Top genre" />
            <Stat v={`'${String(memberYear).slice(2)}`} l="Since" />
          </div>

          {/* Year-by-year timeline */}
          <div className="relative border-l border-[#2e2e2e] ml-2 space-y-8">
            {years.map((d) => {
              const topGenres = [...d.genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);
              const busiest = d.monthly.indexOf(Math.max(...d.monthly));
              const maxMonth = Math.max(...d.monthly, 1);
              const discovered = [...d.discovered].slice(0, 8);
              return (
                <div key={d.year} className="relative pl-6">
                  <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#c4a832] border-2 border-[#111111]" />
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="font-serif text-2xl text-[#f0f0f0]">{d.year}</h2>
                    <span className="text-xs text-[#6b6b6b]">
                      {d.count} album{d.count === 1 ? "" : "s"} · avg {(d.ratingSum / d.count).toFixed(1)}
                    </span>
                  </div>

                  <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 space-y-4">
                    {/* Standout album */}
                    {d.standout && (
                      <Link href={albumHref(d.standout)} className="flex items-center gap-3 group">
                        {d.standout.artwork ? (
                          <img src={d.standout.artwork} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#222222] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#c4a832] uppercase tracking-wide">Highest rated · {d.standout.rating.toFixed(1)}★</p>
                          <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{d.standout.title}</p>
                          <p className="text-xs text-[#6b6b6b] truncate">{d.standout.artist}</p>
                        </div>
                      </Link>
                    )}

                    {/* Top genres */}
                    {topGenres.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-1.5">Favorite genres</p>
                        <div className="flex flex-wrap gap-1.5">
                          {topGenres.map((g) => (
                            <span key={g} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Artists discovered */}
                    {discovered.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-1.5">Artists discovered</p>
                        <p className="text-sm text-[#c8c8c8] leading-relaxed">{discovered.join(" · ")}</p>
                      </div>
                    )}

                    {/* Monthly activity bars */}
                    <div>
                      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-1.5">
                        Monthly highlights · busiest {MONTHS[busiest]}
                      </p>
                      <div className="flex items-end gap-1 h-10">
                        {d.monthly.map((n, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-t bg-[#c4a832]/70" style={{ height: `${(n / maxMonth) * 100}%`, minHeight: n ? 3 : 0 }} />
                            <span className="text-[7px] text-[#4a4a4a]">{MONTHS[i][0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
