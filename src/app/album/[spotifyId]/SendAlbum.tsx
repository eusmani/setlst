"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Portal from "@/components/ui/Portal";
import { storyImageUrl, type StoryPayload } from "@/lib/story";
import { shareReviewToInstagramStory } from "@/lib/instagramStory";
import { tapHaptic } from "@/lib/native";

interface Friend { id: string; username: string; avatar: string | null }
interface Album { spotifyId: string; title: string; artist: string; artwork: string | null }
/** The viewer's own review of this album, when they've written one. */
export interface MyReview { rating: number; subject: string | null; body: string | null; username: string }

export default function SendAlbum({ album, isLoggedIn, review, avgRating, reviewCount }: {
  album: Album; isLoggedIn: boolean; review?: MyReview | null; avgRating?: number | null; reviewCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyNote, setStoryNote] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string | null>(null);

  // Every album is shareable, reviewed or not — an unreviewed card is just the
  // artwork and title, with no grade and nothing quoted. The viewer's handle
  // comes from their review when they have one, else from /api/me on open.
  const username = review?.username ?? viewerName;
  // Your own grade when you've reviewed it, otherwise the album's community
  // average — labelled as such on the card, so a story never implies you gave
  // a grade you didn't.
  const usingAverage = !review && typeof avgRating === "number" && avgRating > 0;
  const storyPayload: StoryPayload = {
    title: album.title,
    artist: album.artist,
    artwork: album.artwork,
    rating: review?.rating ?? (usingAverage ? Math.round(avgRating! * 2) / 2 : 0),
    subject: review?.subject ?? null,
    body: review?.body ?? null,
    username,
    ratingIsAverage: usingAverage,
    ratingCount: usingAverage ? reviewCount ?? 0 : undefined,
    path: `/album/${album.spotifyId}`,
  };

  async function toStory() {
    setStoryBusy(true);
    setStoryNote(null);
    tapHaptic();
    const outcome = await shareReviewToInstagramStory(storyPayload);
    setStoryBusy(false);
    if (outcome === "instagram" || outcome === "shared") setOpen(false);
    else if (outcome === "opened") setStoryNote("Opened the card — save it, then add it to your story.");
    else setStoryNote("Couldn't build the story card. Try again.");
  }

  function openModal() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setOpen(true); setSent(0); setSelected(new Set()); setMessage("");
    if (friends === null) {
      fetch("/api/threads/share").then((r) => r.json()).then((d) => setFriends(Array.isArray(d) ? d : [])).catch(() => setFriends([]));
    }
    if (!review && viewerName === null) {
      fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.username) setViewerName(d.username); }).catch(() => {});
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
      {/* Share entry point for the whole album — friends, or your Instagram story.
          Carries the accent colour rather than muted grey so it reads as the
          page's one action instead of disappearing next to the back link. */}
      <button onClick={openModal} aria-label="Share this album"
        className="p-1.5 -mr-1.5 rounded-full text-[#c4a832] hover:text-[#e0c751] hover:bg-[#2a2412] transition-colors">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
      </button>

      {open && (
        <Portal>
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

            {/* The album's other outbound share: straight to an Instagram story.
                Only once there's a review to put on the card — the card is built
                around a grade, so there's nothing to show without one. */}
            <div className="mt-5 pt-4 border-t border-[#2e2e2e]">
                <div className="flex items-center gap-3">
                  <img
                    src={storyImageUrl(storyPayload, "story")}
                    alt="Preview of the story card"
                    className="h-20 w-auto rounded-md border border-[#2e2e2e] bg-[#0b0b0b] shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <button onClick={toStory} disabled={storyBusy}
                      className="w-full flex items-center justify-center gap-2 bg-[#222222] border border-[#2e2e2e] hover:border-[#c4a832] text-[#f0f0f0] text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                      </svg>
                      {storyBusy ? "Opening Instagram…" : "Share to Instagram Story"}
                    </button>
                    <p className="mt-1.5 text-[11px] text-[#6b6b6b] leading-snug">
                      {storyNote ?? (review ? "Posts your review as a story card." : usingAverage ? "Posts this album and its SETLST score." : "Posts this album as a story card.")}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
