"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RatingInput } from "@/components/ui/RatingMeter";
import type { ReviewDraft } from "./AlbumClient";

interface Album {
  spotifyId: string; title: string; artist: string;
  artwork?: string | null; year?: number | null; genres?: string[];
}

interface Props {
  album: Album;
  trackNames: string[];
  existing?: ReviewDraft | null;
  onSaved: (r: ReviewDraft) => void;
}

// Parenthetical prompts — a different one per album (chosen from the album id,
// so it's stable for that album and won't mismatch during hydration).
const REVIEW_PROMPTS = [
  "it's optional, but it'd be a lot cooler if you did...",
  "for 10 years of good luck",
  "Go on. Don't be shy",
  "your future self will thank you",
  "the people need to know",
  "no one's grading it, promise",
  "say something nice, or don't",
  "for your chance to win some free Title Fight tickets",
];

function promptFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return REVIEW_PROMPTS[Math.abs(h) % REVIEW_PROMPTS.length];
}

export default function ReviewForm({ album, trackNames, existing, onSaved }: Props) {
  const reviewPrompt = promptFor(album.spotifyId);
  // Singles have a single track — no point picking a favorite / least favorite song.
  const isSingle = /[-–—]\s*single\s*$/i.test(album.title.trim());
  const { data: session } = useSession();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [favoriteSong, setFavoriteSong] = useState(existing?.favoriteSong ?? "");
  const [leastFavoriteSong, setLeastFavoriteSong] = useState(existing?.leastFavoriteSong ?? "");
  const [showSongs, setShowSongs] = useState(existing?.showSongs ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (!session) {
    return (
      <p className="text-sm text-[#6b6b6b]">
        <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to log this album
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr("Choose a rating first");
    setErr(""); setSaving(true);
    const payload = {
      rating,
      subject: subject.trim() || null,
      body: body.trim() || null,
      favoriteSong: favoriteSong || null,
      leastFavoriteSong: leastFavoriteSong || null,
      showSongs,
    };
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...album, ...payload }),
    });
    setSaving(false);
    if (!res.ok) setErr((await res.json()).error ?? "Failed");
    else onSaved(payload);
  }

  const selectCls =
    "w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c4a832] transition-colors";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs text-[#a0a0a0] mb-2">Rating</label>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-xs text-[#a0a0a0] mb-2">
          Write a review! <span className="text-[#6b6b6b]">({reviewPrompt})</span>
        </label>
        {/* Subject (title) and body live together as one review */}
        <div className="rounded-lg border border-[#2e2e2e] bg-[#222222] focus-within:border-[#c4a832] transition-colors overflow-hidden">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
            placeholder="Add a title…"
            className="w-full bg-transparent text-base font-semibold text-[#f0f0f0] px-3 pt-3 pb-1.5 placeholder-[#6b6b6b] focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="Share your thoughts on this album…"
            className="w-full bg-transparent text-sm text-[#f0f0f0] px-3 pt-1 pb-3 placeholder-[#6b6b6b] resize-none focus:outline-none"
          />
        </div>
        <p className="text-right text-xs text-[#6b6b6b] mt-1">{body.length}/2000</p>
      </div>

      {!isSingle && trackNames.length > 0 && (
        <>
          <div>
            <label className="block text-xs text-[#a0a0a0] mb-2">♥ Favorite song</label>
            <select value={favoriteSong} onChange={(e) => setFavoriteSong(e.target.value)} className={selectCls}>
              <option value="">— none —</option>
              {trackNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#a0a0a0] mb-2">✕ Least favorite song</label>
            <select value={leastFavoriteSong} onChange={(e) => setLeastFavoriteSong(e.target.value)} className={selectCls}>
              <option value="">— none —</option>
              {trackNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#a0a0a0] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSongs}
              onChange={(e) => setShowSongs(e.target.checked)}
              className="accent-[#c4a832]"
            />
            Show my song picks on my public review
          </label>
        </>
      )}

      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button
        type="submit"
        disabled={saving || !rating}
        className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-40 text-[#111111] px-5 py-2.5 rounded-lg text-sm  transition-colors"
      >
        {saving ? "Saving…" : existing ? "Update" : "Save review"}
      </button>
    </form>
  );
}
