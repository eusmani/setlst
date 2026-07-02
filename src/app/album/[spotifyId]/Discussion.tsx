"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { resizeToDataUrl, moderateImage } from "@/lib/photo";

interface Album {
  spotifyId: string;
  title: string;
  artist: string;
  artwork?: string | null;
}
interface ThreadItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  user: { username: string; avatar: string | null };
  _count: { replies: number };
}

export default function Discussion({ album, isLoggedIn }: { album: Album; isLoggedIn: boolean }) {
  const [threads, setThreads] = useState<ThreadItem[] | null>(null);
  const [composing, setComposing] = useState(false);
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
        const { safe } = await moderateImage(dataUrl); // SFW gate
        if (!safe) { setPhotoErr("That image looks explicit and can't be attached. SETLST is SFW only."); continue; }
        setImages((xs) => (xs.length < 4 ? [...xs, dataUrl] : xs));
      } catch {
        setPhotoErr("Couldn't verify that image — please try another.");
      }
    }
    setChecking(false);
  }

  const composeHref =
    `/thread/new?album=${encodeURIComponent(album.spotifyId)}` +
    `&title=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}` +
    (album.artwork ? `&artwork=${encodeURIComponent(album.artwork)}` : "");

  useEffect(() => {
    fetch(`/api/threads?album=${encodeURIComponent(album.spotifyId)}`)
      .then((r) => r.json())
      .then((d) => setThreads(Array.isArray(d) ? d : []))
      .catch(() => setThreads([]));
  }, [album.spotifyId]);

  async function create() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const r = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumSpotifyId: album.spotifyId, albumTitle: album.title, albumArtist: album.artist,
        albumArtwork: album.artwork ?? null, title, body, images,
      }),
    });
    setSaving(false);
    if (r.ok) {
      const t = await r.json();
      setThreads((ts) => [t, ...(ts ?? [])]);
      setTitle(""); setBody(""); setImages([]); setComposing(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em]">Discussion</h2>
        {isLoggedIn && (
          <>
            {/* Mobile: open a fullscreen composer screen */}
            <Link href={composeHref} className="sm:hidden text-xs text-[#c4a832] hover:underline">
              Start a discussion
            </Link>
            {/* Desktop: inline composer */}
            <button onClick={() => setComposing((c) => !c)} className="hidden sm:inline text-xs text-[#c4a832] hover:underline">
              {composing ? "Cancel" : "Start a discussion"}
            </button>
          </>
        )}
      </div>

      {composing && (
        <div className="mb-4 space-y-2 hidden sm:block">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140}
            placeholder="Discussion title"
            className="w-full bg-[#222222] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b]"
          />
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            placeholder="Talk about the artist, the production, the lyrics — anything."
            className="w-full bg-[#222222] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] resize-y"
          />

          {/* Photo previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setImages((xs) => xs.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-[#2e2e2e] text-[#d0d0d0] flex items-center justify-center text-xs">×</button>
                </div>
              ))}
            </div>
          )}
          {photoErr && <p className="text-xs text-red-400">{photoErr}</p>}

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
            <button
              onClick={create} disabled={saving || checking || !title.trim() || !body.trim()}
              className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Posting…" : "Post discussion"}
            </button>
            <button
              onClick={() => fileRef.current?.click()} disabled={checking || images.length >= 4}
              className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] disabled:opacity-40 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              {checking ? "Checking…" : "Add photo"}
            </button>
            <span className="text-[10px] text-[#6b6b6b] ml-auto">SFW only · up to 4</span>
          </div>
        </div>
      )}

      {threads === null ? (
        <p className="text-xs text-[#6b6b6b] py-3">Loading…</p>
      ) : threads.length === 0 ? (
        <p className="text-xs text-[#6b6b6b] py-3">No discussions yet. {isLoggedIn ? "Start one above." : "Log in to start one."}</p>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link key={t.id} href={`/thread/${t.id}`}
              className="block p-3 bg-[#141414] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-lg transition-colors group">
              <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors leading-snug">{t.title}</p>
              <p className="text-xs text-[#a0a0a0] line-clamp-1 mt-0.5">{t.body}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#6b6b6b]">
                <Avatar username={t.user.username} avatar={t.user.avatar} size={16} />
                <span>{t.user.username}</span>
                <span>· {t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
