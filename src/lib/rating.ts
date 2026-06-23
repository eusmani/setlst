// Tier rating system, worst → best: F (Garbage) → S (Masterpiece).
// Stored as a number (1–10, in 0.5 steps) so averages, trending and existing
// data keep working; displayed as a grade + word on a meter that fills left → right.
//
// These are plain (non-"use client") helpers so they can run in both Server and
// Client Components — calling a function exported from a "use client" module
// during server render throws, so the data/logic lives here instead.

export const COLORS: Record<string, string> = {
  S: "#c4a832", // gold (top)
  A: "#22c55e", // green
  B: "#84cc16", // lime
  C: "#eab308", // yellow
  D: "#f97316", // orange
  F: "#ef4444", // red
};

export interface Grade { letter: string; value: number; word: string; color: string; }

const RAW: Array<[string, number, string]> = [
  ["F", 1, "Garbage"],
  ["D", 2, "Bad"],
  ["C", 4, "Mediocre"],
  ["B", 6, "Good"],
  ["A", 8, "Excellent"],
  ["S", 10, "Masterpiece"],
];

// Grades from worst → best, the order the meter fills in.
export const GRADES: Grade[] = RAW.map(([letter, value, word]) => ({
  letter,
  value,
  word,
  color: COLORS[letter[0]],
}));

// Best → worst (for the display badge order).
export const TIERS = [...GRADES].reverse();

// Map any numeric value to the nearest grade.
export function ratingTier(v: number): Grade {
  return GRADES.reduce((best, g) =>
    Math.abs(g.value - v) < Math.abs(best.value - v) ? g : best
  , GRADES[0]);
}
export function ratingColor(v: number): string {
  return ratingTier(v).color;
}
export function ratingLabel(v: number): string {
  const g = ratingTier(v);
  return `${g.letter} · ${g.word}`;
}
