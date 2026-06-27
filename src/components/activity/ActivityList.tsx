import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import ThreadCard from "@/components/thread/ThreadCard";
import ReplyCard from "@/components/thread/ReplyCard";
import CommentCard from "@/components/thread/CommentCard";
import type { ActivityItem } from "@/lib/feed";

// Renders a mixed activity stream — reviews, discussion threads, and replies —
// as a flat list of cards (caller provides the surrounding container).
export default function ActivityList({ items, isLoggedIn }: { items: ActivityItem[]; isLoggedIn: boolean }) {
  return (
    <>
      {items.map((it) =>
        it.kind === "review" ? (
          <ReviewCard key={`r-${it.review.id}`} review={it.review as ReviewData} isLoggedIn={isLoggedIn} />
        ) : it.kind === "thread" ? (
          <ThreadCard key={`t-${it.thread.id}`} thread={it.thread} />
        ) : it.kind === "reply" ? (
          <ReplyCard key={`p-${it.reply.id}`} reply={it.reply} />
        ) : (
          <CommentCard key={`c-${it.comment.id}`} comment={it.comment} />
        )
      )}
    </>
  );
}
