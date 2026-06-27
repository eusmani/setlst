"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Album { spotifyId: string; title: string; artist: string; artwork: string | null }

// Fullscreen discussion composer (opened from the mobile "Start a discussion" button).
export default function NewThread({ album }: { album: Album }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function post() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    const r = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumSpotifyId: album.spotifyId, albumTitle: album.title, albumArtist: album.artist,
        albumArtwork: album.artwork, title, body,
      }),
    });
    if (r.ok) {
      const t = await r.json();
      router.push(`/thread/${t.id}`);
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#111111] flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#1f1f1f] shrink-0">
        <Link href={`/album/${album.spotifyId}`} className="text-sm text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors">
          Cancel
        </Link>
        <span className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em]">New discussion</span>
        <button
          onClick={post}
          disabled={saving || !title.trim() || !body.trim()}
          className="text-sm font-semibold text-[#c4a832] disabled:opacity-40 transition-opacity"
        >
          {saving ? "Posting…" : "Post"}
        </button>
      </div>

      {/* Album context */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1f1f1f] shrink-0">
        {album.artwork && <img src={album.artwork} alt="" className="w-7 h-7 rounded object-cover" />}
        <span className="text-xs text-[#a0a0a0] truncate">{album.title} · {album.artist}</span>
      </div>

      {/* Fullscreen compose area */}
      <div className="flex-1 flex flex-col px-4 py-3 min-h-0">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} autoFocus
          placeholder="Title"
          className="w-full bg-transparent text-lg text-[#f0f0f0] font-semibold focus:outline-none placeholder-[#6b6b6b] mb-2"
        />
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts on the album, the artist, the production, the lyrics…"
          className="flex-1 w-full bg-transparent text-sm text-[#e8e8e8] focus:outline-none placeholder-[#6b6b6b] resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
