"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface Convo {
  username: string;
  avatar: string | null;
  lastBody: string;
  lastAt: string;
  fromMe: boolean;
  unread: number;
}

function fmt(d: string) {
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [convos, setConvos] = useState<Convo[] | null>(null);

  useEffect(() => {
    fetch("/api/messages").then((r) => r.json()).then((d) => setConvos(Array.isArray(d) ? d : [])).catch(() => setConvos([]));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-24 sm:pb-12">
      <div className="flex items-center gap-2 mb-5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <h1 className="font-serif text-3xl text-[#f0f0f0]">Messages</h1>
      </div>

      {convos === null ? (
        <p className="text-xs text-[#6b6b6b] py-6">Loading…</p>
      ) : convos.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-1">No messages yet.</p>
          <p className="text-xs">Open someone&apos;s profile and tap Message to start a chat.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#1f1f1f] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {convos.map((c) => (
            <Link key={c.username} href={`/inbox/${c.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#222222] transition-colors">
              <Avatar username={c.username} avatar={c.avatar} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f0] truncate">{c.username}</p>
                <p className={`text-xs truncate ${c.unread ? "text-[#e8e8e8] font-medium" : "text-[#6b6b6b]"}`}>
                  {c.fromMe && "You: "}{c.lastBody}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] text-[#6b6b6b]">{fmt(c.lastAt)}</span>
                {c.unread > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#c4a832]" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
