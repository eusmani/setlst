"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

interface UserLite { id: string; username: string; avatar: string | null }
interface Reply { id: string; body: string; createdAt: string; user: UserLite }
interface ThreadData {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
  user: UserLite;
  replies: Reply[];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ThreadView({ thread, currentUserId, isLoggedIn }: { thread: ThreadData; currentUserId: string | null; isLoggedIn: boolean }) {
  const router = useRouter();
  const [replies, setReplies] = useState<Reply[]>(thread.replies);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  async function postReply() {
    if (!text.trim()) return;
    setPosting(true);
    const r = await fetch("/api/threads/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, body: text }),
    });
    setPosting(false);
    if (r.ok) { const reply = await r.json(); setReplies((rs) => [...rs, reply]); setText(""); }
  }

  async function removeReply(id: string) {
    setReplies((rs) => rs.filter((x) => x.id !== id));
    await fetch(`/api/threads/replies?id=${id}`, { method: "DELETE" });
  }

  async function deleteThread() {
    if (!confirm("Delete this discussion?")) return;
    await fetch(`/api/threads?id=${thread.id}`, { method: "DELETE" });
    router.push(`/album/${thread.album.spotifyId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      {/* Album the discussion is about */}
      <Link href={`/album/${thread.album.spotifyId}`} className="inline-flex items-center gap-2 mb-4 text-xs text-[#a0a0a0] hover:text-[#c4a832] transition-colors">
        {thread.album.artwork && <img src={thread.album.artwork} alt="" className="w-7 h-7 rounded object-cover" />}
        <span>← {thread.album.title} · {thread.album.artist}</span>
      </Link>

      {/* Original post */}
      <h1 className="font-serif text-2xl sm:text-3xl text-[#f0f0f0] leading-tight mb-3">{thread.title}</h1>
      <div className="flex items-center gap-2 text-xs text-[#a0a0a0] mb-4">
        <Avatar username={thread.user.username} avatar={thread.user.avatar} size={22} />
        <Link href={`/profile/${thread.user.username}`} className="hover:text-[#c4a832] transition-colors">{thread.user.username}</Link>
        <span className="text-[#6b6b6b]">· {fmt(thread.createdAt)}</span>
        {currentUserId === thread.user.id && (
          <button onClick={deleteThread} className="ml-auto text-[#6b6b6b] hover:text-red-400 transition-colors">Delete</button>
        )}
      </div>
      <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap leading-relaxed mb-8">{thread.body}</p>

      {/* Replies */}
      <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h2>
      <div className="space-y-3 mb-6">
        {replies.map((r) => (
          <div key={r.id} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-[#a0a0a0] mb-1.5">
              <Avatar username={r.user.username} avatar={r.user.avatar} size={18} />
              <Link href={`/profile/${r.user.username}`} className="hover:text-[#c4a832] transition-colors">{r.user.username}</Link>
              <span className="text-[#6b6b6b]">· {fmt(r.createdAt)}</span>
              {currentUserId === r.user.id && (
                <button onClick={() => removeReply(r.id)} className="ml-auto text-[#6b6b6b] hover:text-red-400 transition-colors">Delete</button>
              )}
            </div>
            <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap leading-relaxed">{r.body}</p>
          </div>
        ))}
        {replies.length === 0 && <p className="text-xs text-[#6b6b6b]">No replies yet — start the conversation.</p>}
      </div>

      {/* Reply box */}
      {isLoggedIn ? (
        <div className="space-y-2">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder="Add a reply…"
            className="w-full bg-[#222222] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] resize-y"
          />
          <button
            onClick={postReply} disabled={posting || !text.trim()}
            className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {posting ? "Posting…" : "Reply"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#6b6b6b]"><Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to join the discussion.</p>
      )}
    </div>
  );
}
