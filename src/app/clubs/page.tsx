import Link from "next/link";
import { getWeeklyClubs, type ClubPick } from "@/lib/clubs";

export const dynamic = "force-dynamic";

function albumHref(a: ClubPick, review = false) {
  return `/album/${a.spotifyId}?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}` +
    (a.artwork ? `&artwork=${encodeURIComponent(a.artwork)}` : "") + (review ? "&review=1" : "");
}

function weekLabel() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

export default async function ClubsPage() {
  const clubs = await getWeeklyClubs();

  return (
    <div className="max-w-4xl mx-auto px-5 pt-5 pb-16">
      <div className="mb-1 flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <h1 className="font-serif text-3xl text-[#f0f0f0]">Grails</h1>
      </div>
      <p className="text-sm text-[#a0a0a0] mb-1">Four albums the whole community listens to together this week.</p>
      <p className="text-xs text-[#6b6b6b] uppercase tracking-[0.15em] mb-6">{weekLabel()}</p>

      {clubs.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm">This week&apos;s grails are loading — check back shortly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clubs.map((c) => (
            <div key={c.category} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4 flex gap-4">
              <Link href={albumHref(c)} className="shrink-0">
                {c.artwork ? (
                  <img src={c.artwork} alt={c.title} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover" />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-[#222222]" />
                )}
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <span className="text-[10px] text-[#c4a832] uppercase tracking-[0.15em]">{c.label}</span>
                <Link href={albumHref(c)} className="block group">
                  <p className="text-base text-[#f0f0f0] leading-snug group-hover:text-[#c4a832] transition-colors truncate">{c.title}</p>
                  <p className="text-sm text-[#a0a0a0] truncate">{c.artist}{c.year ? ` · ${c.year}` : ""}</p>
                </Link>
                <p className="text-xs text-[#6b6b6b] mt-1 line-clamp-2">{c.blurb}</p>
                <div className="flex items-center gap-2 mt-auto pt-3">
                  <Link href={albumHref(c, true)}
                    className="flex-1 text-center text-xs bg-[#c4a832] hover:bg-[#d4ba44] text-[#141414] font-medium py-1.5 rounded-lg transition-colors">
                    Review
                  </Link>
                  <Link href={albumHref(c)}
                    className="flex-1 text-center text-xs border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#c4a832] py-1.5 rounded-lg transition-colors">
                    Discuss
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
