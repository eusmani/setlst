"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  likeCount: number;
  likedByMe: boolean;
}

interface Props {
  albumSpotifyId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Comments({ albumSpotifyId, isLoggedIn, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?albumId=${albumSpotifyId}`)
      .then((r) => r.json())
      .then((d) => { setComments(Array.isArray(d) ? d : []); setLoading(false); });
  }, [albumSpotifyId]);

  async function post() {
    if (!body.trim()) return;
    setPosting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumSpotifyId, body }),
    });
    const d = await res.json();
    setPosting(false);
    if (!d.error) { setComments((c) => [d, ...c]); setBody(""); }
  }

  async function toggleLike(id: string) {
    if (!isLoggedIn) return;
    setComments((cs) => cs.map((c) =>
      c.id === id ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) } : c
    ));
    const res = await fetch("/api/comments/like", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id }),
    });
    const d = await res.json();
    if (!d.error) {
      setComments((cs) => cs.map((c) => c.id === id ? { ...c, likedByMe: d.liked, likeCount: d.count } : c));
    }
  }

  async function remove(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="mt-10">
      <h2 className="text-sm text-[#a0a0a0] uppercase tracking-[0.15em] mb-4">
        Comments {comments.length > 0 && <span className="text-[#6b6b6b]">({comments.length})</span>}
      </h2>

      {isLoggedIn ? (
        <div className="mb-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Share your thoughts on this album…"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] resize-none transition-colors"
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-[#6b6b6b]">{body.length}/1000</span>
            <button
              onClick={post}
              disabled={posting || !body.trim()}
              className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-40 text-[#111111] px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#6b6b6b] mb-5">
          <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to join the conversation.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[#6b6b6b] py-6 text-center">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#6b6b6b] py-6 text-center">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Link href={`/profile/${c.user.username}`} className="shrink-0">
                <Avatar username={c.user.username} avatar={c.user.avatar} size={32} />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/profile/${c.user.username}`} className="text-sm text-[#f0f0f0] hover:text-[#c4a832] transition-colors">
                      {c.user.username}
                    </Link>
                    <span className="text-xs text-[#6b6b6b]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[#bbbbbb] leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
                </div>
                <div className="flex items-center gap-3 mt-1.5 px-1">
                  <button
                    onClick={() => toggleLike(c.id)}
                    disabled={!isLoggedIn}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      c.likedByMe ? "text-[#c4a832]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"
                    } ${!isLoggedIn ? "cursor-default" : ""}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={c.likedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {c.likeCount > 0 && c.likeCount}
                  </button>
                  {currentUserId === c.user.id && (
                    <button onClick={() => remove(c.id)} className="text-xs text-[#6b6b6b] hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
