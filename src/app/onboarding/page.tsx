"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ALL_GENRES = [
  "Hip-Hop", "Rap", "R&B", "Rock", "Alternative", "Indie",
  "Metal", "Jazz", "Soul", "Electronic", "Pop", "Classical",
  "Reggae", "Latin", "Blues", "Punk", "Shoegaze", "Lo-Fi",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(genre: string) {
    setSelected((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 5
        ? [...prev, genre]
        : prev
    );
  }

  async function save() {
    setSaving(true);
    await fetch("/api/user/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres: selected }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-5">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl text-[#f0f0f0] mb-2" style={{ fontFamily: "var(--font-jakarta)" }}>
            What do you listen to?
          </h1>
          <p className="text-sm text-[#6b6b6b]">
            Pick up to 5 genres — we&apos;ll use these to personalise your recommendations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {ALL_GENRES.map((genre) => {
            const active = selected.includes(genre);
            const maxed = selected.length >= 5 && !active;
            return (
              <button
                key={genre}
                onClick={() => toggle(genre)}
                disabled={maxed}
                className={`px-4 py-2 rounded-full text-sm transition-colors border ${
                  active
                    ? "bg-[#c4a832] border-[#c4a832] text-[#111111]"
                    : maxed
                    ? "bg-[#1a1a1a] border-[#1f1f1f] text-[#3a3a3a] cursor-not-allowed"
                    : "bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4">
          <p className="text-xs text-[#555555]">
            {selected.length}/5 selected
          </p>
        </div>

        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 text-sm text-[#6b6b6b] hover:text-[#f0f0f0] border border-[#2e2e2e] hover:border-[#555555] rounded-lg transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={save}
            disabled={saving || selected.length === 0}
            className="px-6 py-2.5 text-sm bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
