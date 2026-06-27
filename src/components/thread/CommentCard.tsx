import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import type { CommentActivity } from "@/lib/feed";

// An album comment (a reply to the album's reviews) in an activity feed.
export default function CommentCard({ comment }: { comment: CommentActivity }) {
  const date = new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <article className="flex gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      {comment.album.artwork && (
        <Link href={`/album/${comment.album.spotifyId}`} className="shrink-0 self-start">
          <img src={comment.album.artwork} alt={comment.album.title} width={48} height={48}
            className="rounded-md object-cover w-12 h-12" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0] mb-1">
          <Avatar username={comment.user.username} avatar={comment.user.avatar} size={18} />
          <Link href={`/profile/${comment.user.username}`} className="hover:text-[#c4a832] transition-colors">{comment.user.username}</Link>
          <span className="flex items-center gap-1 text-[#6b6b6b]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            commented
          </span>
        </div>
        <Link href={`/album/${comment.album.spotifyId}`} className="block group">
          <p className="text-sm text-[#e8e8e8] line-clamp-2 group-hover:text-[#c4a832] transition-colors leading-snug">{comment.body}</p>
        </Link>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#6b6b6b]">
          <span>on <Link href={`/album/${comment.album.spotifyId}`} className="text-[#a0a0a0] hover:text-[#c4a832] transition-colors">{comment.album.title}</Link></span>
          <span>· {date}</span>
        </div>
      </div>
    </article>
  );
}
