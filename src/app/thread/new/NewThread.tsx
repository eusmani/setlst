"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resizeToDataUrl, moderateImage } from "@/lib/photo";

interface Album { spotifyId: string; title: string; artist: string; artwork: string | null }

// Fullscreen discussion composer (opened from the mobile "Start a discussion" button).
export default function NewThread({ album }: { album: Album }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setPhotoErr("");
    setChecking(true);
    for (const file of files) {
      if (images.length >= 4) { setPhotoErr("Up to 4 photos."); break; }
      try {
        const dataUrl = await resizeToDataUrl(file);
        const { safe } = await moderateImage(dataUrl); // SFW gate — fails closed
        if (!safe) { setPhotoErr("That image looks explicit and can't be attached. SETLST is SFW only."); continue; }
        setImages((xs) => (xs.length < 4 ? [...xs, dataUrl] : xs));
      } catch {
        setPhotoErr("Couldn't verify that image — please try another.");
      }
    }
    setChecking(false);
  }

  async function post() {
    if (!title.trim() || !body.trim() || saving || checking) return;
    setSaving(true);
    const r = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumSpotifyId: album.spotifyId, albumTitle: album.title, albumArtist: album.artist,
        albumArtwork: album.artwork, title, body, images,
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
          disabled={saving || checking || !title.trim() || !body.trim()}
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
      <div className="flex-1 flex flex-col px-4 py-3 min-h-0 overflow-y-auto">
        {/* Add-photo bubble — sits above the title and text */}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={checking || images.length >= 4}
            className="inline-flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-[#c4a832] bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full px-3.5 py-1.5 disabled:opacity-40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            {checking ? "Checking…" : "Add photo"}
          </button>
          <span className="text-[10px] text-[#6b6b6b]">SFW only · up to 4</span>
        </div>

        {/* Photo previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => setImages((xs) => xs.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-[#2e2e2e] text-[#d0d0d0] flex items-center justify-center text-xs">×</button>
              </div>
            ))}
          </div>
        )}
        {photoErr && <p className="text-xs text-red-400 mb-2">{photoErr}</p>}

        <input
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} autoFocus
          placeholder="Title"
          className="w-full bg-transparent text-lg text-[#f0f0f0] font-semibold focus:outline-none placeholder-[#6b6b6b] mb-2"
        />
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts on the album, the artist, the production, the lyrics…"
          className="min-h-[140px] flex-1 w-full bg-transparent text-sm text-[#e8e8e8] focus:outline-none placeholder-[#6b6b6b] resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
