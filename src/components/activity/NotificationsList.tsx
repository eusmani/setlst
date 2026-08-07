"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

type Kind = "follow" | "follow_request" | "reply" | "review_like" | "comment_like" | "thread_share";

interface Notification {
  id: string;
  kind: Kind;
  createdAt: string;
  actor: { username: string; avatar: string | null };
  detail?: string;
  href: string;
}

// What happened to you: replies on your discussions, likes on your reviews,
// follows and follow requests, discussions shared with you — the Instagram /
// Letterboxd notifications inbox.
//
// Distinct from the activity feed, which is what everyone else has been up to.
export default function NotificationsList({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setItems([]); return; }
    let live = true;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { if (live) setItems(d.notifications ?? []); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <Empty message="Log in to see your notifications." href="/login" cta="Sign in →" />
    );
  }
  if (items === null) {
    return (
      <div className="space-y-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Empty
        message="Nothing yet. Replies, likes and new followers land here."
        href="/members"
        cta="Find people to follow →"
      />
    );
  }

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl divide-y divide-[#1f1f1f] overflow-hidden">
      {items.map((n) => (
        <Link key={n.id} href={n.href} className="flex items-center gap-3 px-3.5 py-3">
          <Avatar username={n.actor.username} avatar={n.actor.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#e8e8e8] leading-snug">
              <span className="font-semibold text-[#f0f0f0]">{n.actor.username}</span>{" "}
              <span className="text-[#a0a0a0]">{verb(n.kind)}</span>
            </p>
            {n.detail && verb(n.kind) !== n.detail && (
              <p className="text-[12px] text-[#6b6b6b] truncate mt-0.5">{n.detail}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-[#6b6b6b]">{ago(n.createdAt)}</span>
          <Icon kind={n.kind} />
        </Link>
      ))}
    </div>
  );
}

function verb(kind: Kind): string {
  switch (kind) {
    case "follow": return "started following you";
    case "follow_request": return "wants to follow you";
    case "reply": return "replied to your discussion";
    case "review_like": return "liked your review";
    case "comment_like": return "liked your comment";
    case "thread_share": return "shared a discussion with you";
  }
}

function Icon({ kind }: { kind: Kind }) {
  const common = {
    width: 15, height: 15, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  const colour =
    kind === "review_like" || kind === "comment_like" ? "#ef4444"
    : kind === "reply" ? "#c4a832"
    : "#6b6b6b";

  return (
    <span className="shrink-0" style={{ color: colour }}>
      {kind === "review_like" || kind === "comment_like" ? (
        <svg {...common} fill="currentColor" stroke="none"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.7z" /></svg>
      ) : kind === "reply" ? (
        <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" /></svg>
      ) : (
        <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
      )}
    </span>
  );
}

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`;
}

function Empty({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <div className="py-12 text-center bg-[#141414] border border-[#1f1f1f] rounded-xl">
      <p className="text-sm text-[#8a8a8a] mb-2">{message}</p>
      <Link href={href} className="text-xs text-[#c4a832]">{cta}</Link>
    </div>
  );
}
