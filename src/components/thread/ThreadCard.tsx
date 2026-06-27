import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import type { ThreadActivity } from "@/lib/feed";

// A discussion thread as it appears in an activity feed, alongside reviews.
export default function ThreadCard({ thread }: { thread: ThreadActivity }) {
  const date = new Date(thread.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <article className="flex gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      {thread.album.artwork && (
        <Link href={`/album/${thread.album.spotifyId}`} className="shrink-0 self-start">
          <img src={thread.album.artwork} alt={thread.album.title} width={48} height={48}
            className="rounded-md object-cover w-12 h-12" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0] mb-1">
          <Avatar username={thread.user.username} avatar={thread.user.avatar} size={18} />
          <Link href={`/profile/${thread.user.username}`} className="hover:text-[#c4a832] transition-colors">{thread.user.username}</Link>
          <span className="flex items-center gap-1 text-[#6b6b6b]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            started a discussion
          </span>
        </div>

        <Link href={`/thread/${thread.id}`} className="block group">
          <p className="text-sm text-[#f0f0f0] font-medium group-hover:text-[#c4a832] transition-colors leading-snug">{thread.title}</p>
          <p className="text-xs text-[#a0a0a0] line-clamp-2 mt-0.5">{thread.body}</p>
        </Link>

        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#6b6b6b]">
          <span>on <Link href={`/album/${thread.album.spotifyId}`} className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors">{thread.album.title}</Link></span>
          <span>· {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}</span>
          <span>· {date}</span>
        </div>
      </div>
    </article>
  );
}
