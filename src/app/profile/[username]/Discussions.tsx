"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface ThreadTile {
  id: string;
  title: string;
  albumTitle: string;
  albumArtist: string;
  albumArtwork: string | null;
  user: { username: string; avatar: string | null };
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {threads.slice(0, 3).map((t) => (
              <Link key={t.id} href={`/thread/${t.id}`}
                className="flex flex-col bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl p-3 transition-colors group min-h-[96px]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Avatar username={t.user.username} avatar={t.user.avatar} size={16} />
                  <span className="text-[11px] text-[#a0a0a0] truncate">{t.user.username}</span>
                </div>
                <p className="text-sm text-[#f0f0f0] line-clamp-2 group-hover:text-[#c4a832] transition-colors leading-snug">{t.title}</p>
                <p className="text-[11px] text-[#6b6b6b] truncate mt-auto pt-1">{t.albumTitle}</p>
                <p className="text-[11px] text-[#6b6b6b]">{t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}</p>
              </Link>
            ))}
          </div>
          {threads.length > 3 && (
            <div className="mt-3 flex justify-center">
              <Link href={`/profile/${username}/discussions`}
                className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full px-4 py-2 transition-colors">
                See more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
