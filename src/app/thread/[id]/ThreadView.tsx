"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

interface UserLite { id: string; username: string; avatar: string | null }
interface Reply { id: string; body: string; createdAt: string; user: UserLite; parentId: string | null; likeCount: number; dislikeCount: number; myVote: number }
interface ThreadData {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
  user: UserLite;
  replies: Reply[];
  likeCount: number;
  dislikeCount: number;
  myVote: number;
}
interface Friend { id: string; username: string; avatar: string | null }

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ThreadView({ thread, currentUserId, isLoggedIn }: { thread: ThreadData; currentUserId: string | null; isLoggedIn: boolean }) {
  const router = useRouter();
  const [replies, setReplies] = useState<Reply[]>(thread.replies);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  // Like / dislike
  const [vote, setVote] = useState({ like: thread.likeCount, dislike: thread.dislikeCount, mine: thread.myVote });
  async function castVote(value: 1 | -1) {
    if (!isLoggedIn) { router.push("/login"); return; }
    const r = await fetch("/api/threads/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, value }),
    });
    if (r.ok) { const d = await r.json(); setVote({ like: d.likeCount, dislike: d.dislikeCount, mine: d.myVote }); }
  }

  // Share to friends
  const [shareOpen, setShareOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  function openShare() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setShareOpen(true); setSentCount(0);
    if (friends === null) fetch("/api/threads/share").then((r) => r.json()).then((d) => setFriends(Array.isArray(d) ? d : [])).catch(() => setFriends([]));
  }
  function toggleFriend(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  async function send() {
    if (selected.size === 0) return;
    setSending(true);
    const r = await fetch("/api/threads/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, toUserIds: [...selected] }),
    });
    setSending(false);
    if (r.ok) { setSentCount(selected.size); setSelected(new Set()); setTimeout(() => setShareOpen(false), 1000); }
  }

  // Post a reply (top-level when parentId is null, otherwise nested under it).
  async function submitReply(body: string, parentId: string | null): Promise<boolean> {
    const r = await fetch("/api/threads/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, body, parentId }),
    });
    if (!r.ok) return false;
    const reply = await r.json();
    setReplies((rs) => [...rs, { ...reply, parentId, likeCount: 0, dislikeCount: 0, myVote: 0 }]);
    return true;
  }

  async function postReply() {
    if (!text.trim()) return;
    setPosting(true);
    const ok = await submitReply(text, null);
    setPosting(false);
    if (ok) setText("");
  }

  // Group replies by parent so they can render as a nested comment tree.
  const childrenOf = useMemo(() => {
    const map = new Map<string, Reply[]>();
    const ids = new Set(replies.map((r) => r.id));
    for (const r of replies) {
      // Orphans (parent deleted) fall back to top level.
      const key = r.parentId && ids.has(r.parentId) ? r.parentId : "root";
      (map.get(key) ?? map.set(key, []).get(key)!).push(r);
    }
    for (const list of map.values()) list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return map;
  }, [replies]);

  async function removeReply(id: string) {
    setReplies((rs) => rs.filter((x) => x.id !== id));
    await fetch(`/api/threads/replies?id=${id}`, { method: "DELETE" });
  }

  async function voteReply(replyId: string, value: 1 | -1) {
    if (!isLoggedIn) { router.push("/login"); return; }
    const r = await fetch("/api/threads/replies/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyId, value }),
    });
    if (r.ok) {
      const d = await r.json();
      setReplies((rs) => rs.map((x) => x.id === replyId ? { ...x, likeCount: d.likeCount, dislikeCount: d.dislikeCount, myVote: d.myVote } : x));
    }
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
      <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap leading-relaxed mb-4">{thread.body}</p>

      {/* Like / dislike / share */}
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => castVote(1)}
          className={`flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5 transition-colors ${vote.mine === 1 ? "border-[#c4a832] text-[#c4a832]" : "border-[#2e2e2e] text-[#a0a0a0] hover:text-[#f0f0f0]"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={vote.mine === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7" /></svg>
          {vote.like}
        </button>
        <button onClick={() => castVote(-1)}
          className={`flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5 transition-colors ${vote.mine === -1 ? "border-red-400 text-red-400" : "border-[#2e2e2e] text-[#a0a0a0] hover:text-[#f0f0f0]"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={vote.mine === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17" /></svg>
          {vote.dislike}
        </button>
        <button onClick={openShare}
          className="flex items-center gap-1.5 text-xs border border-[#2e2e2e] text-[#a0a0a0] hover:text-[#f0f0f0] rounded-full px-3 py-1.5 transition-colors ml-auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          Share
        </button>
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-4 py-8" onClick={() => setShareOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-[#f0f0f0] font-semibold">Share with friends</h3>
              <button onClick={() => setShareOpen(false)} className="text-[#6b6b6b] hover:text-[#f0f0f0]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
              </button>
            </div>
            {sentCount > 0 ? (
              <p className="text-sm text-[#c4a832] py-6 text-center">Sent to {sentCount} {sentCount === 1 ? "friend" : "friends"} ✓</p>
            ) : friends === null ? (
              <p className="text-xs text-[#6b6b6b] py-6 text-center">Loading…</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-[#6b6b6b] py-6 text-center">Follow people to share with them.</p>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto -mx-1 mb-4">
                  {friends.map((f) => (
                    <button key={f.id} onClick={() => toggleFriend(f.id)}
                      className="w-full flex items-center gap-2 px-1 py-2 hover:bg-[#222222] rounded-lg transition-colors">
                      <Avatar username={f.username} avatar={f.avatar} size={28} />
                      <span className="text-sm text-[#f0f0f0] flex-1 text-left truncate">{f.username}</span>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected.has(f.id) ? "bg-[#c4a832] border-[#c4a832]" : "border-[#2e2e2e]"}`}>
                        {selected.has(f.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={send} disabled={sending || selected.size === 0}
                  className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-40 text-[#111111] text-sm py-2.5 rounded-lg transition-colors">
                  {sending ? "Sending…" : selected.size > 0 ? `Send to ${selected.size}` : "Select friends"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Replies */}
      <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h2>
      <div className="space-y-3 mb-6">
        {(childrenOf.get("root") ?? []).map((r) => (
          <ReplyNode key={r.id} reply={r} childrenOf={childrenOf} depth={0}
            currentUserId={currentUserId} isLoggedIn={isLoggedIn}
            onVote={voteReply} onRemove={removeReply} onReply={submitReply} />
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

// One reply in the nested comment tree — with its own like/dislike, a reply box,
// and recursively-rendered child replies.
function ReplyNode({
  reply, childrenOf, depth, currentUserId, isLoggedIn, onVote, onRemove, onReply,
}: {
  reply: Reply;
  childrenOf: Map<string, Reply[]>;
  depth: number;
  currentUserId: string | null;
  isLoggedIn: boolean;
  onVote: (id: string, value: 1 | -1) => void;
  onRemove: (id: string) => void;
  onReply: (body: string, parentId: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const kids = childrenOf.get(reply.id) ?? [];

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await onReply(text, reply.id);
    setBusy(false);
    if (ok) { setText(""); setOpen(false); }
  }

  return (
    <div className={depth > 0 ? "ml-3 sm:ml-5 pl-3 border-l border-[#1f1f1f]" : ""}>
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs text-[#a0a0a0] mb-1.5">
          <Avatar username={reply.user.username} avatar={reply.user.avatar} size={18} />
          <Link href={`/profile/${reply.user.username}`} className="hover:text-[#c4a832] transition-colors">{reply.user.username}</Link>
          <span className="text-[#6b6b6b]">· {fmt(reply.createdAt)}</span>
          {currentUserId === reply.user.id && (
            <button onClick={() => onRemove(reply.id)} className="ml-auto text-[#6b6b6b] hover:text-red-400 transition-colors">Delete</button>
          )}
        </div>
        <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap leading-relaxed">{reply.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => onVote(reply.id, 1)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${reply.myVote === 1 ? "text-[#c4a832]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={reply.myVote === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7" /></svg>
            {reply.likeCount > 0 && reply.likeCount}
          </button>
          <button onClick={() => onVote(reply.id, -1)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${reply.myVote === -1 ? "text-red-400" : "text-[#6b6b6b] hover:text-[#a0a0a0]"}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={reply.myVote === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17" /></svg>
            {reply.dislikeCount > 0 && reply.dislikeCount}
          </button>
          {isLoggedIn && (
            <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
              {open ? "Cancel" : "Reply"}
            </button>
          )}
        </div>

        {open && (
          <div className="mt-2 space-y-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus
              placeholder="Reply…"
              className="w-full bg-[#222222] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] resize-y" />
            <button onClick={send} disabled={busy || !text.trim()}
              className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-xs px-3 py-1.5 rounded-lg transition-colors">
              {busy ? "Posting…" : "Post reply"}
            </button>
          </div>
        )}
      </div>

      {kids.length > 0 && (
        <div className="mt-3 space-y-3">
          {kids.map((k) => (
            <ReplyNode key={k.id} reply={k} childrenOf={childrenOf} depth={depth + 1}
              currentUserId={currentUserId} isLoggedIn={isLoggedIn}
              onVote={onVote} onRemove={onRemove} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
