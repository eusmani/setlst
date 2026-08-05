"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import ContentMenu from "@/components/moderation/ContentMenu";

interface Reaction { emoji: string; mine: boolean }
interface Message {
  id: string;
  body: string | null;
  createdAt: string;
  fromMe: boolean;
  thread: { id: string; title: string; album: string } | null;
  album: { spotifyId: string; title: string; artist: string; artwork: string | null } | null;
  reactions: Reaction[];
}
interface Partner { username: string; avatar: string | null }

const EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

function fmtTime(d: string) {
  const date = new Date(d);
  const today = new Date().toDateString() === date.toDateString();
  const t = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return today ? t : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${t}`;
}

// First whole emoji/grapheme from typed input (handles multi-codepoint emoji).
function firstGrapheme(s: string): string {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) { for (const { segment } of new Seg(undefined, { granularity: "grapheme" }).segment(s)) return segment; }
  return [...s][0] ?? s;
}

export default function ChatView({ username }: { username: string }) {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState<string | null>(null); // messageId whose emoji bar is open
  const [loaded, setLoaded] = useState(false);
  // Set when the conversation is unavailable (blocked in either direction), or
  // when a send is rejected — e.g. the content filter turned it down.
  const [unavailable, setUnavailable] = useState(false);
  const [sendError, setSendError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  // Hidden input that summons the OS emoji keyboard for "react with any emoji".
  const emojiInputRef = useRef<HTMLInputElement>(null);
  const customForRef = useRef<string | null>(null);

  function openEmojiKeyboard(messageId: string) {
    customForRef.current = messageId;
    setPicker(null);
    emojiInputRef.current?.focus();
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`);
      if (res.status === 403) { setUnavailable(true); setLoaded(true); return; }
      const d = await res.json();
      if (d?.partner) { setPartner(d.partner); setMessages(d.messages); }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [username]);

  useEffect(() => { load(); }, [load]);
  // Light polling so replies appear without a refresh.
  useEffect(() => {
    if (unavailable) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, unavailable]);

  // Keep pinned to the newest message when the count grows.
  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    setText("");
    const r = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUsername: username, body }),
    });
    setSending(false);
    if (r.ok) {
      const m = await r.json();
      setMessages((xs) => [...xs, { ...m, thread: null }]);
    } else {
      // Put the text back and say why — a 422 is the content filter, a 403 is a
      // block or a suspended account.
      setText(body);
      const d = await r.json().catch(() => ({}));
      setSendError(d.error ?? "Couldn't send that message.");
      if (r.status === 403) setUnavailable(true);
    }
  }

  async function react(messageId: string, emoji: string) {
    setPicker(null);
    const r = await fetch("/api/messages/react", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (r.ok) {
      const d = await r.json();
      setMessages((xs) => xs.map((m) => (m.id === messageId ? { ...m, reactions: d.reactions } : m)));
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#111111] flex flex-col" onClick={() => setPicker(null)}>
      {/* Header */}
      <div className="shrink-0 border-b border-[#1f1f1f] bg-[#111111]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto w-full px-3 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/inbox")} aria-label="Back" className="p-1 text-[#a0a0a0] hover:text-[#f0f0f0]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {partner && (
            <>
              <Link href={`/profile/${partner.username}`} className="flex items-center gap-2.5 min-w-0">
                <Avatar username={partner.username} avatar={partner.avatar} size={34} />
                <span className="text-sm text-[#f0f0f0] font-medium truncate">{partner.username}</span>
              </Link>
              {/* Report or block the person you're talking to (guideline 1.2). */}
              <ContentMenu
                contentType="user"
                contentId={partner.username}
                authorUsername={partner.username}
                label="this conversation"
                onBlocked={() => setUnavailable(true)}
                className="ml-auto"
              />
            </>
          )}
        </div>
      </div>

      {/* Blocked in either direction: the thread is closed, not just hidden. */}
      {unavailable ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-xs">
            <p className="text-sm text-[#f0f0f0] mb-2">This conversation is unavailable</p>
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              You can&apos;t message this person. If you blocked them, you can undo that in{" "}
              <Link href="/settings" className="text-[#c4a832] hover:underline">Settings → Blocked accounts</Link>.
            </p>
          </div>
        </div>
      ) : (
      <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-1">
          {!loaded ? (
            <p className="text-center text-xs text-[#6b6b6b] py-8">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-[#6b6b6b] py-8">Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.fromMe ? "items-end" : "items-start"}`}>
                <div className="relative max-w-[78%]">
                  <div
                    onClick={(e) => { e.stopPropagation(); setPicker(picker === m.id ? null : m.id); }}
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-snug cursor-pointer select-none whitespace-pre-wrap break-words ${
                      m.fromMe ? "bg-[#c4a832] text-[#141414] rounded-br-md" : "bg-[#262626] text-[#f0f0f0] rounded-bl-md"
                    }`}
                  >
                    {m.thread && (
                      <Link href={`/thread/${m.thread.id}`} onClick={(e) => e.stopPropagation()} className="block">
                        <span className="block text-[10px] uppercase tracking-wide opacity-70">Shared a discussion</span>
                        <span className="block font-semibold">{m.thread.title}</span>
                        <span className="block text-xs opacity-80">{m.thread.album}</span>
                      </Link>
                    )}
                    {m.album && (
                      <Link href={`/album/${m.album.spotifyId}?title=${encodeURIComponent(m.album.title)}&artist=${encodeURIComponent(m.album.artist)}${m.album.artwork ? `&artwork=${encodeURIComponent(m.album.artwork)}` : ""}`}
                        onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 -mx-0.5">
                        {m.album.artwork && <img src={m.album.artwork} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
                        <span className="min-w-0">
                          <span className="block text-[10px] uppercase tracking-wide opacity-70">Shared an album</span>
                          <span className="block font-semibold truncate">{m.album.title}</span>
                          <span className="block text-xs opacity-80 truncate">{m.album.artist}</span>
                        </span>
                      </Link>
                    )}
                    {m.body && (
                      <span className={(m.thread || m.album) ? "block mt-2 pt-2 border-t border-black/10" : ""}>{m.body}</span>
                    )}
                  </div>

                  {/* Emoji reaction bar */}
                  {picker === m.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute top-full mt-1 ${m.fromMe ? "right-0" : "left-0"} z-10 flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2e2e2e] rounded-full px-2.5 py-1.5 shadow-xl`}
                    >
                      {EMOJIS.map((e) => (
                        <button key={e} onClick={() => react(m.id, e)} className="text-lg leading-none hover:scale-125 transition-transform">{e}</button>
                      ))}
                      {/* Any emoji → opens the device emoji keyboard */}
                      <button onClick={() => openEmojiKeyboard(m.id)} aria-label="More emojis"
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-[#2a2a2a] text-[#a0a0a0] hover:text-[#f0f0f0]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing reactions */}
                {m.reactions.length > 0 && (
                  <div className={`flex gap-1 mt-1 ${m.fromMe ? "mr-1" : "ml-1"}`}>
                    {m.reactions.map((r, idx) => (
                      <button key={idx} onClick={(e) => { e.stopPropagation(); react(m.id, r.emoji); }}
                        className={`text-xs rounded-full px-1.5 py-0.5 border ${r.mine ? "border-[#c4a832] bg-[#2a2412]" : "border-[#2e2e2e] bg-[#1a1a1a]"}`}>
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sent time */}
                <span className={`text-[10px] text-[#6b6b6b] mt-0.5 mb-1.5 ${m.fromMe ? "mr-1" : "ml-1"}`}>{fmtTime(m.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[#1f1f1f] bg-[#111111] pb-[env(safe-area-inset-bottom)]">
        {/* Why a message was refused — content filter (422) or suspension (403). */}
        {sendError && (
          <div className="max-w-2xl mx-auto w-full px-3 pt-2">
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg leading-snug">
              {sendError}
            </p>
          </div>
        )}
        <div className="max-w-2xl mx-auto w-full px-3 py-2.5 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Message…"
            className="flex-1 bg-[#222222] border border-[#2e2e2e] rounded-full px-4 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b]"
          />
          <button onClick={send} disabled={sending || !text.trim()} aria-label="Send"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#c4a832] text-[#141414] disabled:opacity-40 active:scale-95 transition-transform">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
      </>
      )}

      {/* Off-screen input that pops the OS emoji keyboard for picking any emoji */}
      <input
        ref={emojiInputRef}
        aria-hidden
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          e.target.value = "";
          const id = customForRef.current;
          customForRef.current = null;
          if (v && id) { react(id, firstGrapheme(v)); emojiInputRef.current?.blur(); }
        }}
        className="fixed bottom-2 left-2 w-px h-px opacity-0"
      />
    </div>
  );
}
