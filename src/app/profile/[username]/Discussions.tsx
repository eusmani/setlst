"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ThreadTile {
  id: string;
  title: string;
  albumTitle: string;
  albumArtist: string;
  albumArtwork: string | null;
  authored: boolean;
  _count: { replies: number };
}

export default function Discussions({ username, isOwner }: { username: string; isOwner: boolean }) {
  const [threads, setThreads] = useState<ThreadTile[] | null>(null);

  useEffect(() => {
    fetch(`/api/threads?user=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => setThreads(Array.isArray(d) ? d : []))
      .catch(() => setThreads([]));
  }, [username]);

  if (threads === null) return null;
  if (!isOwner && threads.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mb-4">Discussions</h2>

      {threads.length === 0 ? (
        <div className="py-8 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-1">No discussions yet.</p>
          <p className="text-xs">Start or reply to a discussion on any album.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/thread/${t.id}`}
              className="flex flex-col bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl p-3 transition-colors group min-h-[96px]">
              <span className="text-[9px] uppercase tracking-wide text-[#c4a832] mb-1">{t.authored ? "Started" : "Replied"}</span>
              <p className="text-sm text-[#f0f0f0] line-clamp-2 group-hover:text-[#c4a832] transition-colors leading-snug">{t.title}</p>
              <p className="text-[11px] text-[#6b6b6b] truncate mt-auto pt-1">{t.albumTitle}</p>
              <p className="text-[11px] text-[#6b6b6b]">{t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
