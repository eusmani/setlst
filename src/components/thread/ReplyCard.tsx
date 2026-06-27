import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import type { ReplyActivity } from "@/lib/feed";

// A discussion reply as it appears in an activity feed, alongside reviews and threads.
export default function ReplyCard({ reply }: { reply: ReplyActivity }) {
  const date = new Date(reply.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <article className="flex gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      {reply.album.artwork && (
        <Link href={`/album/${reply.album.spotifyId}`} className="shrink-0 self-start">
          <img src={reply.album.artwork} alt={reply.album.title} width={48} height={48}
            className="rounded-md object-cover w-12 h-12" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0] mb-1">
          <Avatar username={reply.user.username} avatar={reply.user.avatar} size={18} />
          <Link href={`/profile/${reply.user.username}`} className="hover:text-[#c4a832] transition-colors">{reply.user.username}</Link>
          <span className="flex items-center gap-1 text-[#6b6b6b]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            replied
          </span>
        </div>

        <Link href={`/thread/${reply.thread.id}`} className="block group">
          <p className="text-[11px] text-[#6b6b6b] mb-0.5 truncate">on “{reply.thread.title}”</p>
          <p className="text-sm text-[#e8e8e8] line-clamp-2 group-hover:text-[#c4a832] transition-colors leading-snug">{reply.body}</p>
        </Link>

        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#6b6b6b]">
          <span><Link href={`/album/${reply.album.spotifyId}`} className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors">{reply.album.title}</Link></span>
          <span>· {date}</span>
        </div>
      </div>
    </article>
  );
}
