"use client";
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface Requester { username: string; avatar: string | null; }

export default function FollowRequests({ initial }: { initial: Requester[] }) {
  const [requests, setRequests] = useState<Requester[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(username: string, action: "accept" | "reject") {
    setBusy(username);
    const res = await fetch("/api/follow-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterUsername: username, action }),
    });
    setBusy(null);
    if (res.ok) setRequests((prev) => prev.filter((r) => r.username !== username));
  }

  if (requests.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">
        Follow requests <span className="text-[#c4a832]">{requests.length}</span>
      </h2>
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl divide-y divide-[#1f1f1f]">
        {requests.map((r) => (
          <div key={r.username} className="flex items-center gap-3 px-4 py-2.5">
            <Link href={`/profile/${r.username}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
              <Avatar username={r.username} avatar={r.avatar} size={32} />
              <span className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{r.username}</span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => act(r.username, "accept")}
                disabled={busy === r.username}
                className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => act(r.username, "reject")}
                disabled={busy === r.username}
                className="border border-[#2e2e2e] hover:border-red-900/40 hover:text-red-400 disabled:opacity-50 text-[#a0a0a0] text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
