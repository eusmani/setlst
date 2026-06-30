"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

interface Friend { id: string; username: string; avatar: string | null }
interface Album { spotifyId: string; title: string; artist: string; artwork: string | null }

export default function SendAlbum({ album, isLoggedIn }: { album: Album; isLoggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  function openModal() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setOpen(true); setSent(0); setSelected(new Set()); setMessage("");
    if (friends === null) {
      fetch("/api/threads/share").then((r) => r.json()).then((d) => setFriends(Array.isArray(d) ? d : [])).catch(() => setFriends([]));
    }
  }
  function toggle(username: string) {
    setSelected((s) => { const n = new Set(s); n.has(username) ? n.delete(username) : n.add(username); return n; });
  }
  async function send() {
    if (selected.size === 0) return;
    setSending(true);
    const r = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUsernames: [...selected], album, body: message.trim() || undefined }),
    });
    setSending(false);
    if (r.ok) { const d = await r.json(); setSent(d.sent ?? selected.size); setTimeout(() => setOpen(false), 1100); }
  }

  return (
    <>
      <button onClick={openModal} aria-label="Send to a friend"
        className="p-1.5 -mr-1.5 rounded-full text-[#a0a0a0] hover:text-[#c4a832] hover:bg-[#1a1a1a] transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 px-4 py-8" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm text-[#f0f0f0] font-semibold">Send album</h3>
              <button onClick={() => setOpen(false)} className="text-[#6b6b6b] hover:text-[#f0f0f0]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
              </button>
            </div>
            <p className="text-xs text-[#6b6b6b] mb-4 truncate">{album.title} · {album.artist}</p>

            {sent > 0 ? (
              <p className="text-sm text-[#c4a832] text-center py-6">Sent to {sent} {sent === 1 ? "person" : "people"} ✓</p>
            ) : friends === null ? (
              <p className="text-xs text-[#6b6b6b] text-center py-6">Loading…</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-[#6b6b6b] text-center py-6">Follow people to message them.</p>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  {friends.map((f) => {
                    const on = selected.has(f.username);
                    return (
                      <button key={f.id} onClick={() => toggle(f.username)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${on ? "border-[#c4a832] bg-[#2a2412]" : "border-transparent hover:bg-[#222222]"}`}>
                        <Avatar username={f.username} avatar={f.avatar} size={32} />
                        <span className="text-sm text-[#f0f0f0] flex-1 text-left truncate">{f.username}</span>
                        {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message… (optional)"
                  maxLength={500}
                  className="w-full bg-[#222222] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] mb-3"
                />
                <button onClick={send} disabled={sending || selected.size === 0}
                  className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-40 text-[#141414] text-sm font-medium py-2 rounded-lg transition-colors">
                  {sending ? "Sending…" : `Send${selected.size ? ` (${selected.size})` : ""}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
