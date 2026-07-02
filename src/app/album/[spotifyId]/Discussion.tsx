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
          // Opens the fullscreen composer in-app (same tab) on both mobile and desktop.
          <Link href={composeHref} className="text-xs text-[#c4a832] hover:underline">
            Start a discussion
          </Link>
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
