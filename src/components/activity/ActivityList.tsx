import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import ThreadCard from "@/components/thread/ThreadCard";
import ReplyCard from "@/components/thread/ReplyCard";
import type { ActivityItem } from "@/lib/feed";

// Renders a mixed activity stream — reviews, discussion threads, and replies —
// as a flat list of cards (caller provides the surrounding container).
export default function ActivityList({ items, isLoggedIn }: { items: ActivityItem[]; isLoggedIn: boolean }) {
  return (
    <>
      {items.map((it) =>
        it.kind === "review" ? (
          <ReviewCard key={`r-${it.review.id}`} review={it.review as ReviewData} isLoggedIn={isLoggedIn} clampBody />
        ) : it.kind === "thread" ? (
          <ThreadCard key={`t-${it.thread.id}`} thread={it.thread} />
        ) : (
          <ReplyCard key={`p-${it.reply.id}`} reply={it.reply} />
        )
      )}
    </>
  );
}
