"use client";

import { COLORS, GRADES, ratingTier } from "@/lib/rating";

// Re-export the pure tier helpers so existing imports from this module keep working.
export { GRADES, TIERS, ratingTier, ratingColor, ratingLabel } from "@/lib/rating";

interface DisplayProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const TRACK = { sm: "h-1.5", md: "h-2", lg: "h-3" };
const LABEL = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

// Read-only meter: a bar that fills left → right to the album's grade.
export function RatingMeter({ value, size = "md", showLabel = true }: DisplayProps) {
  const g = ratingTier(value);
  const pct = Math.max(6, Math.min(100, (value / 10) * 100));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`relative flex-1 ${TRACK[size]} rounded-full bg-[#262626] overflow-hidden`}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: g.color }}
        />
      </div>
      {showLabel && (
        <span className={`${LABEL[size]} font-bold shrink-0 flex items-baseline gap-1.5`} style={{ color: g.color }}>
          {g.letter}
          {size !== "sm" && <span className="text-xs font-medium opacity-90">{g.word}</span>}
        </span>
      )}
    </div>
  );
}

interface InputProps {
  value: number;
  onChange: (v: number) => void;
}

// Sliding meter — drag left (F-, Garbage) → right (S+, Masterpiece).
export function RatingInput({ value, onChange }: InputProps) {
  const max = GRADES.length - 1; // 17
  const idx = value ? GRADES.findIndex((g) => g.value === ratingTier(value).value) : -1;
  const g = idx >= 0 ? GRADES[idx] : null;
  const pct = idx >= 0 ? (idx / max) * 100 : 0;
  const baseLetters = ["F", "D", "C", "B", "A", "S"];

  return (
    <div>
      {/* current grade + word */}
      <div className="mb-2 h-9 flex items-baseline gap-2.5">
        {g ? (
          <>
            <span className="text-3xl font-bold" style={{ color: g.color }}>{g.letter}</span>
            <span className="text-lg font-medium" style={{ color: g.color }}>{g.word}</span>
          </>
        ) : (
          <span className="text-base text-[#6b6b6b]">Slide to rate</span>
        )}
      </div>

      <div className="relative h-9 flex items-center">
        {/* track */}
        <div className="absolute inset-x-0 h-5 rounded-full bg-[#262626]" />
        {/* fill */}
        <div
          className="absolute left-0 h-5 rounded-full"
          style={{ width: `${pct}%`, background: g?.color ?? "transparent" }}
        />
        {/* thumb */}
        {idx >= 0 && (
          <div
            className="absolute w-8 h-8 -translate-x-1/2 rounded-full border-2 border-[#111111] shadow"
            style={{ left: `${pct}%`, background: g?.color }}
          />
        )}
        {/* native range on top, invisible but interactive */}
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={idx < 0 ? 0 : idx}
          onChange={(e) => onChange(GRADES[Number(e.target.value)].value)}
          aria-label="Rating"
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* base-letter scale */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {baseLetters.map((b) => (
          <span
            key={b}
            className="text-base font-bold"
            style={{ color: g && g.letter[0] === b ? COLORS[b] : "#6b6b6b" }}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
