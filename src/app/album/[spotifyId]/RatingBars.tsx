import { GRADES, ratingTier } from "@/lib/rating";

// Distribution bar chart of an album's review grades (F → S), plus the average.
export default function RatingBars({ ratings }: { ratings: number[] }) {
  if (!ratings.length) return null;

  const counts = GRADES.map((g) => ratings.filter((r) => ratingTier(r).letter === g.letter).length);
  const max = Math.max(...counts, 1);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const avgTier = ratingTier(avg);

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em]">Average Rating</p>
        <p className="text-sm font-bold flex items-baseline gap-1.5" style={{ color: avgTier.color }}>
          {avgTier.letter}
          <span className="text-xs font-medium">{avgTier.word}</span>
          <span className="text-[11px] text-[#6b6b6b] font-normal ml-1">
            · {ratings.length} {ratings.length === 1 ? "review" : "reviews"}
          </span>
        </p>
      </div>

      {/* bars rise from a 0 baseline */}
      <div className="flex items-end gap-2 h-16 border-b border-[#2e2e2e]">
        {GRADES.map((g, i) => (
          <div key={g.letter} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-[#6b6b6b] tabular-nums mb-1">{counts[i] || ""}</span>
            <div
              className="w-1.5 rounded-t-sm transition-all"
              style={{
                height: `${(counts[i] / max) * 100}%`,
                minHeight: counts[i] > 0 ? "3px" : "0",
                background: g.color,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        {GRADES.map((g, i) => (
          <span
            key={g.letter}
            className="flex-1 text-center text-xs font-bold"
            style={{ color: counts[i] > 0 ? g.color : "#6b6b6b" }}
          >
            {g.letter}
          </span>
        ))}
      </div>
    </div>
  );
}
