import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { ratingTier } from "@/lib/rating";
import type { ActivityItem } from "@/lib/feed";

// One item in the mobile home feed, shaped like the social feeds people already
// know: a byline row, then the thing itself at a size worth looking at, then the
// words. Album art is the hero rather than a 48px thumbnail squeezed beside
// three lines of metadata — that's the difference between a feed and a list.

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function Byline({
  username, avatar, action, at,
}: { username: string; avatar: string | null; action: string; at: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <Link href={`/profile/${username}`} className="shrink-0">
        <Avatar username={username} avatar={avatar} size={32} />
      </Link>
      <p className="text-[13px] text-[#c8c8c8] leading-tight min-w-0">
        <Link href={`/profile/${username}`} className="font-semibold text-[#f0f0f0]">
          {username}
        </Link>{" "}
        <span className="text-[#8a8a8a]">{action}</span>
      </p>
      <span className="ml-auto shrink-0 text-[11px] text-[#6b6b6b]">{timeAgo(at)}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="bg-[#141414] border border-[#1f1f1f] rounded-2xl overflow-hidden">
      {children}
    </article>
  );
}

export default function FeedCard({ item }: { item: ActivityItem }) {
  if (item.kind === "review") {
    const { review } = item;
    const grade = ratingTier(review.rating);
    return (
      <Card>
        <Byline username={review.user.username} avatar={review.user.avatar}
          action="rated an album" at={review.createdAt} />

        <Link href={`/album/${review.album.spotifyId}`} className="press-soft block relative">
          {review.album.artwork ? (
            <img src={review.album.artwork} alt={review.album.title}
              loading="lazy" decoding="async"
              className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-[#1f1f1f]" />
          )}
          {/* Grade sits on the art, the way a rating badge does in a poster app. */}
          <span
            className="absolute top-3 right-3 flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold backdrop-blur-md"
            style={{ color: grade.color, background: "rgba(0,0,0,0.55)", border: `2px solid ${grade.color}` }}
            title={`${grade.letter} — ${grade.word}`}
          >
            {grade.letter}
          </span>
        </Link>

        <div className="px-3 py-3">
          <Link href={`/album/${review.album.spotifyId}`} className="block">
            <p className="text-[15px] text-[#f0f0f0] font-semibold leading-snug">{review.album.title}</p>
            <p className="text-[13px] text-[#8a8a8a] mt-0.5">{review.album.artist}</p>
          </Link>
          {review.subject && (
            <p className="text-[14px] text-[#f0f0f0] font-semibold mt-2.5 leading-snug">{review.subject}</p>
          )}
          {review.body && (
            <p className="text-[14px] text-[#bbbbbb] mt-1 leading-relaxed line-clamp-3">{review.body}</p>
          )}
        </div>
      </Card>
    );
  }

  if (item.kind === "thread") {
    const { thread } = item;
    return (
      <Card>
        <Byline username={thread.user.username} avatar={thread.user.avatar}
          action="started a discussion" at={thread.createdAt} />
        <Link href={`/thread/${thread.id}`} className="press-soft block px-3 pb-3">
          <div className="flex gap-3">
            {thread.album.artwork && (
              <img src={thread.album.artwork} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[15px] text-[#f0f0f0] font-semibold leading-snug">{thread.title}</p>
              <p className="text-[13px] text-[#a0a0a0] mt-1 line-clamp-2 leading-relaxed">{thread.body}</p>
              <p className="text-[11px] text-[#6b6b6b] mt-1.5">
                {thread.album.title} · {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
              </p>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  const { reply } = item;
  return (
    <Card>
      <Byline username={reply.user.username} avatar={reply.user.avatar}
        action="replied to a discussion" at={reply.createdAt} />
      <Link href={`/thread/${reply.thread.id}`} className="press-soft block px-3 pb-3">
        <p className="text-[14px] text-[#e8e8e8] leading-relaxed line-clamp-3">{reply.body}</p>
        <p className="text-[11px] text-[#6b6b6b] mt-1.5">on {reply.thread.title}</p>
      </Link>
    </Card>
  );
}
