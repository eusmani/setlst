"use client";
import { useState } from "react";
import Link from "next/link";
import FeedCard from "./FeedCard";
import { tapHaptic } from "@/lib/native";
import type { ActivityItem } from "@/lib/feed";

interface Props {
  items: ActivityItem[];
  empty: { msg: string; href: string; cta: string };
  /** How many to show before "See more". */
  limit?: number;
}

// The mobile home feed: a scrollable column of cards, the way Instagram, DICE
// and Spotify all present the thing you came to see.
//
// "See more" expands the list in place rather than navigating to the activity
// screen — the point of having the feed on the home screen is that you don't
// have to leave it.
export default function MobileFeed({ items, empty, limit = 12 }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center bg-[#141414] border border-[#1f1f1f] rounded-2xl">
        <p className="text-sm text-[#8a8a8a] mb-2">{empty.msg}</p>
        <Link href={empty.href} className="text-xs text-[#c4a832]">{empty.cta}</Link>
      </div>
    );
  }

  const shown = expanded ? items : items.slice(0, limit);
  const remaining = items.length - shown.length;

  return (
    <div className="space-y-3">
      {shown.map((item) => (
        <FeedCard key={`${item.kind}-${keyOf(item)}`} item={item} />
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => { setExpanded(true); void tapHaptic(); }}
          className="w-full flex items-center justify-center gap-1.5 text-[13px] text-[#a0a0a0] border border-[#232323] rounded-xl py-3"
        >
          See more
          <span className="text-[#6b6b6b]">({remaining})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {expanded && items.length > limit && (
        <button
          type="button"
          onClick={() => { setExpanded(false); void tapHaptic(); }}
          className="w-full text-[13px] text-[#6b6b6b] py-2"
        >
          Show less
        </button>
      )}
    </div>
  );
}

function keyOf(item: ActivityItem): string {
  switch (item.kind) {
    case "review": return item.review.id;
    case "thread": return item.thread.id;
    case "reply": return item.reply.id;
  }
}
