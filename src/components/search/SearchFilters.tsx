"use client";
import { useState } from "react";

export type Filter =
  | { kind: "decade"; decade: number }
  | { kind: "year"; year: number }
  | { kind: "genre"; genre: string }
  | { kind: "popular" }
  | { kind: "rating" };

// Newest first: 2020s down to 1920s.
const DECADES = Array.from({ length: 11 }, (_, i) => 2020 - i * 10);

// The years shown inside a decade, never running past the current year — so the
// 2020s stops at today (2026) rather than offering empty future years, and rolls
// forward on its own each January (client-evaluated, no code change needed).
function yearsInDecade(decadeStart: number): number[] {
  const now = new Date().getFullYear();
  const end = Math.min(decadeStart + 9, now);
  // Newest year first, to match the decades running 2020s → 1920s.
  const out: number[] = [];
  for (let y = end; y >= decadeStart; y--) out.push(y);
  return out;
}

// The genre set the search page carried before the pill rail was removed. These
// spellings are the keys /api/spotify/genre validates against — changing one
// here silently 400s, so keep them in step with GENRE_QUERIES.
const GENRES = [
  "Hip-Hop", "Rap", "R&B", "Rock", "Alternative", "Indie",
  "Metal", "Jazz", "Soul", "Electronic", "Pop", "Classical",
  "Reggae", "Latin", "Blues", "Punk", "Shoegaze", "Lo-Fi",
];

const chip =
  "shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors border whitespace-nowrap";
const chipOff =
  "bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]";
const chipOn = "bg-[#c4a832] border-[#c4a832] text-[#111111]";

export default function SearchFilters({
  active,
  onChange,
}: {
  active: Filter | null;
  onChange: (f: Filter | null) => void;
}) {
  // Which drill-down panel is open. Kept separate from `active` so you can
  // browse decades without having committed to one yet.
  const [panel, setPanel] = useState<"decade" | "genre" | null>(null);
  // Which decade's years are showing.
  const [openDecade, setOpenDecade] = useState<number | null>(null);

  const isDecadeish = active?.kind === "decade" || active?.kind === "year";

  // Selecting the already-selected filter clears it.
  function pick(f: Filter) {
    const same =
      (f.kind === "popular" && active?.kind === "popular") ||
      (f.kind === "rating" && active?.kind === "rating") ||
      (f.kind === "genre" && active?.kind === "genre" && active.genre === f.genre) ||
      (f.kind === "year" && active?.kind === "year" && active.year === f.year) ||
      (f.kind === "decade" && active?.kind === "decade" && active.decade === f.decade);
    onChange(same ? null : f);
  }

  function togglePanel(p: "decade" | "genre") {
    setPanel((cur) => (cur === p ? null : p));
  }

  return (
    <div className="mb-6">
      {/* Top row — the four filter boxes */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => togglePanel("decade")}
          className={`${chip} ${isDecadeish || panel === "decade" ? chipOn : chipOff}`}
        >
          {active?.kind === "year" ? active.year
            : active?.kind === "decade" ? `${active.decade}s`
            : "Years"} <span aria-hidden className="opacity-60">▾</span>
        </button>

        <button
          onClick={() => pick({ kind: "popular" })}
          className={`${chip} ${active?.kind === "popular" ? chipOn : chipOff}`}
        >
          Most Popular
        </button>

        <button
          onClick={() => pick({ kind: "rating" })}
          className={`${chip} ${active?.kind === "rating" ? chipOn : chipOff}`}
        >
          Highest Rated
        </button>

        <button
          onClick={() => togglePanel("genre")}
          className={`${chip} ${active?.kind === "genre" || panel === "genre" ? chipOn : chipOff}`}
        >
          {active?.kind === "genre" ? active.genre : "Genre"}{" "}
          <span aria-hidden className="opacity-60">▾</span>
        </button>

        {active && (
          <button
            onClick={() => { onChange(null); setPanel(null); setOpenDecade(null); }}
            className={`${chip} bg-transparent border-transparent text-[#6b6b6b] hover:text-[#f0f0f0]`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Decade drill-down: decades, then the years inside the one you pick */}
      {panel === "decade" && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DECADES.map((d) => (
              <button
                key={d}
                onClick={() => { setOpenDecade(d); pick({ kind: "decade", decade: d }); }}
                className={`${chip} ${
                  openDecade === d || (active?.kind === "decade" && active.decade === d)
                    ? chipOn : chipOff
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {openDecade !== null && (
            <div className="flex gap-2 overflow-x-auto pb-1 pl-1 border-l border-[#2e2e2e]">
              {yearsInDecade(openDecade).map((y) => (
                <button
                  key={y}
                  onClick={() => pick({ kind: "year", year: y })}
                  className={`${chip} ${
                    active?.kind === "year" && active.year === y ? chipOn : chipOff
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Genre drill-down */}
      {panel === "genre" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => pick({ kind: "genre", genre: g })}
              className={`${chip} ${
                active?.kind === "genre" && active.genre === g ? chipOn : chipOff
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
