import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPremium } from "@/lib/premium";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseGenres(raw: string | null): string[] {
  if (!raw) return [];
  try { const g = JSON.parse(raw); return Array.isArray(g) ? g.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <p className="text-sm text-[#a0a0a0] mb-3">Sign in to see your review analytics.</p>
        <Link href="/login" className="text-sm text-[#c4a832] hover:underline">Sign in →</Link>
      </div>
    );
  }

  const premium = await isPremium(session.user.id);
  if (!premium) {
    return (
      <div className="max-w-lg mx-auto px-5 pt-6 pb-16">
        <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
        <div className="mt-8 text-center bg-gradient-to-br from-[#c4a832]/12 to-[#1a1a1a] border border-[#c4a832]/40 rounded-2xl p-8">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#c4a832" className="mx-auto mb-3"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" stroke="#c4a832" strokeWidth="2" fill="none" /></svg>
          <h1 className="font-serif text-2xl text-[#f0f0f0] mb-1">Review Analytics</h1>
          <p className="text-sm text-[#a0a0a0] mb-5">Rating trends, your reviewing habits, and monthly recaps — part of SETLST Pro.</p>
          <Link href="/plus" className="inline-block bg-[#c4a832] hover:bg-[#d4ba44] text-[#141414] text-sm font-semibold px-5 py-2 rounded-lg transition-colors">Unlock with Pro</Link>
        </div>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { rating: true, createdAt: true, album: { select: { genres: true, artist: true, title: true, artwork: true, spotifyId: true } } },
  });

  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  // Rating distribution (rounded to whole stars 1–5).
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) { const b = Math.min(4, Math.max(0, Math.round(r.rating) - 1)); dist[b]++; }
  const distMax = Math.max(...dist, 1);

  // Reviews per month over the last 12 months (monthly recap).
  const now = new Date();
  const buckets: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTHS[d.getMonth()], count: 0 });
  }
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
  for (const r of reviews) {
    const t = r.createdAt.getTime();
    if (t < startMonth) continue;
    const idx = (r.createdAt.getFullYear() - now.getFullYear()) * 12 + (r.createdAt.getMonth() - now.getMonth()) + 11;
    if (idx >= 0 && idx < 12) buckets[idx].count++;
  }
  const monthMax = Math.max(...buckets.map((b) => b.count), 1);
  const thisMonth = buckets[11].count;

  // Top genres.
  const genreCount = new Map<string, number>();
  for (const r of reviews) for (const g of parseGenres(r.album.genres)) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  const topGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Highest-rated of this month (recap highlight).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthReviews = reviews.filter((r) => r.createdAt.getTime() >= monthStart);
  const highlight = monthReviews.sort((a, b) => b.rating - a.rating)[0]?.album ?? null;

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-2 mb-6">Review Analytics</h1>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-2 bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
        <div className="text-center"><p className="text-2xl text-[#f0f0f0] font-bold tabular-nums">{total}</p><p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mt-0.5">Reviews</p></div>
        <div className="text-center"><p className="text-2xl text-[#f0f0f0] font-bold tabular-nums">{avg.toFixed(1)}</p><p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mt-0.5">Avg rating</p></div>
        <div className="text-center"><p className="text-2xl text-[#f0f0f0] font-bold tabular-nums">{thisMonth}</p><p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mt-0.5">This month</p></div>
      </div>

      {/* Monthly recap */}
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
        <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-3">Reviews per month · last 12</p>
        <div className="flex items-end gap-1.5 h-24">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-[#c4a832]/70" style={{ height: `${(b.count / monthMax) * 100}%`, minHeight: b.count ? 4 : 0 }} title={`${b.count}`} />
              <span className="text-[8px] text-[#4a4a4a]">{b.label[0]}</span>
            </div>
          ))}
        </div>
        {highlight && (
          <Link href={`/album/${highlight.spotifyId}?title=${encodeURIComponent(highlight.title)}&artist=${encodeURIComponent(highlight.artist)}${highlight.artwork ? `&artwork=${encodeURIComponent(highlight.artwork)}` : ""}`}
            className="flex items-center gap-3 mt-4 pt-4 border-t border-[#1f1f1f] group">
            {highlight.artwork && <img src={highlight.artwork} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-[10px] text-[#c4a832] uppercase tracking-wide">This month&apos;s top-rated</p>
              <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{highlight.title}</p>
              <p className="text-xs text-[#6b6b6b] truncate">{highlight.artist}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Rating distribution */}
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
        <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-3">Rating distribution</p>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = dist[stars - 1];
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-[11px] text-[#a0a0a0] w-8 shrink-0">{stars}★</span>
                <div className="flex-1 h-3 bg-[#222222] rounded-full overflow-hidden">
                  <div className="h-full bg-[#c4a832]" style={{ width: `${(n / distMax) * 100}%` }} />
                </div>
                <span className="text-[11px] text-[#6b6b6b] w-6 text-right tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top genres */}
      {topGenres.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4">
          <p className="text-[10px] text-[#6b6b6b] uppercase tracking-wider mb-2.5">Your top genres</p>
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map(([g, n]) => (
              <span key={g} className="text-xs bg-[#222222] border border-[#2e2e2e] text-[#d8d8d8] px-2.5 py-1 rounded-full">{g} · {n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
