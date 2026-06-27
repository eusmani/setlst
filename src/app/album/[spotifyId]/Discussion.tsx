"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

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
  const [saving, setSaving] = useState(false);

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
        albumArtwork: album.artwork ?? null, title, body,
      }),
    });
    setSaving(false);
    if (r.ok) {
      const t = await r.json();
      setThreads((ts) => [t, ...(ts ?? [])]);
      setTitle(""); setBody(""); setComposing(false);
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
          <button
            onClick={create} disabled={saving || !title.trim() || !body.trim()}
            className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? "Posting…" : "Post discussion"}
          </button>
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
