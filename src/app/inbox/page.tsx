"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface Share {
  id: string;
  createdAt: string;
  fromUser: { username: string; avatar: string | null };
  thread: { id: string; title: string; albumTitle: string; albumArtist: string; albumArtwork: string | null };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [shares, setShares] = useState<Share[] | null>(null);

  useEffect(() => {
    fetch("/api/inbox").then((r) => r.json()).then((d) => setShares(Array.isArray(d) ? d : [])).catch(() => setShares([]));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-12">
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-1">Inbox</h1>
      <p className="text-sm text-[#6b6b6b] mb-5">Discussions friends have shared with you.</p>

      {shares === null ? (
        <p className="text-xs text-[#6b6b6b] py-6">Loading…</p>
      ) : shares.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm">Nothing shared with you yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shares.map((s) => (
            <Link key={s.id} href={`/thread/${s.thread.id}`}
              className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl transition-colors group">
              {s.thread.albumArtwork ? (
                <img src={s.thread.albumArtwork} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded bg-[#222222] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{s.thread.title}</p>
                <p className="text-xs text-[#a0a0a0] truncate">{s.thread.albumTitle} · {s.thread.albumArtist}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#6b6b6b]">
                  <Avatar username={s.fromUser.username} avatar={s.fromUser.avatar} size={14} />
                  <span>{s.fromUser.username} shared · {fmt(s.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
