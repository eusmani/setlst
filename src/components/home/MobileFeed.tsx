import Link from "next/link";
import FeedCard from "./FeedCard";
import type { ActivityItem } from "@/lib/feed";

interface Props {
  items: ActivityItem[];
  /** Full-screen view for this feed. */
  href: string;
  empty: { msg: string; href: string; cta: string };
  /** How many to show before linking out. Feeds are for scrolling, so this is
      generous — the old three-item preview made the app's main content feel
      like a footnote. */
  limit?: number;
}

// The mobile home feed: a scrollable column of cards, the way Instagram, DICE
// and Spotify all present the thing you came to see.
export default function MobileFeed({ items, href, empty, limit = 12 }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center bg-[#141414] border border-[#1f1f1f] rounded-2xl">
        <p className="text-sm text-[#8a8a8a] mb-2">{empty.msg}</p>
        <Link href={empty.href} className="text-xs text-[#c4a832]">{empty.cta}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, limit).map((item) => (
        <FeedCard key={`${item.kind}-${keyOf(item)}`} item={item} />
      ))}

      {items.length > limit && (
        <Link
          href={href}
          className="flex items-center justify-center gap-1.5 text-[13px] text-[#a0a0a0] border border-[#232323] rounded-xl py-3"
        >
          See more
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </Link>
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
