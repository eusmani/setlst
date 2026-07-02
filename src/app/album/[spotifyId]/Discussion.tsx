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

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em]">Discussion</h2>
        {isLoggedIn && (
          <>
            {/* Mobile: open the fullscreen composer in place */}
            <Link href={composeHref} className="sm:hidden text-xs text-[#c4a832] hover:underline">
              Start a discussion
            </Link>
            {/* Desktop: open the full composer in a new window for more room to write */}
            <Link
              href={composeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-[#c4a832] hover:underline"
            >
              Start a discussion
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </Link>
          </>
        )}
      </div>

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
