"use client";
import { useEffect, useState } from "react";
import Portal from "@/components/ui/Portal";
import { storyImageUrl, type StoryPayload } from "@/lib/story";
import { instagramStoryAvailable, shareReviewToInstagramStory, shareStoryImage } from "@/lib/instagramStory";
import { tapHaptic, shareNative, isNative } from "@/lib/native";

interface Props {
  payload: StoryPayload;
  /** Absolute or app-relative link to the thing being shared. */
  link: string;
  shareText: string;
  onClose: () => void;
}

// The bottom sheet behind every review's share button: a live preview of the
// story card plus the three things people actually want to do with it.
export default function ShareSheet({ payload, link, shareText, onClose }: Props) {
  const [busy, setBusy] = useState<"story" | "image" | "link" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hasInstagram, setHasInstagram] = useState(false);

  useEffect(() => {
    let live = true;
    instagramStoryAvailable().then((ok) => { if (live) setHasInstagram(ok); });
    return () => { live = false; };
  }, []);

  // Escape closes, like the rest of the app's overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fullLink = typeof window !== "undefined" ? new URL(link, window.location.origin).toString() : link;

  async function toInstagram() {
    setBusy("story");
    tapHaptic();
    const outcome = await shareReviewToInstagramStory(payload);
    setBusy(null);
    if (outcome === "instagram") onClose();
    else if (outcome === "opened") setNote("Opened the card — save it, then add it to your story.");
    else if (outcome === "failed") setNote("Couldn't build the story card. Try again.");
    else onClose();
  }

  async function toImage() {
    setBusy("image");
    tapHaptic();
    const outcome = await shareStoryImage(payload);
    setBusy(null);
    if (outcome === "opened") setNote("Opened the card in a new tab — long-press to save it.");
    else if (outcome === "failed") setNote("Couldn't build the story card. Try again.");
    else onClose();
  }

  // Inside the app this opens the real iOS share sheet (Messages, AirDrop, any
  // installed app) rather than silently copying to the clipboard.
  async function shareLink() {
    setBusy("link");
    tapHaptic();
    const outcome = await shareNative({
      title: "SETLST",
      text: shareText,
      url: fullLink,
      dialogTitle: "Share this review",
    });
    if (outcome === "copied") setNote("Link copied.");
    else if (outcome === "cancelled" && !isNative()) setNote(fullLink);
    else if (outcome === "shared") onClose();
    setBusy(null);
  }

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share this review"
    >
      <div
        className="w-full sm:max-w-sm bg-[#161616] border border-[#2e2e2e] rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-[#3a3a3a]" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em]">Share review</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          </button>
        </div>

        {/* What's about to be posted */}
        <div className="flex justify-center mb-5">
          <img
            src={storyImageUrl(payload, "story")}
            alt="Preview of the story card"
            className="h-44 w-auto rounded-xl border border-[#2e2e2e] bg-[#0b0b0b]"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={toInstagram}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] text-sm font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            {busy === "story" ? "Opening Instagram…" : "Share to Instagram Story"}
          </button>

          <button
            onClick={toImage}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 bg-[#1f1f1f] border border-[#2e2e2e] hover:border-[#c4a832] text-[#f0f0f0] text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </svg>
            {busy === "image" ? "Preparing…" : hasInstagram ? "Save or share the card" : "Share the card"}
          </button>

          <button
            onClick={shareLink}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 bg-transparent text-[#a0a0a0] hover:text-[#f0f0f0] text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            {busy === "link" ? "Sharing…" : isNative() ? "Share…" : "Copy link"}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-[#6b6b6b] min-h-[1rem]">{note ?? shareText}</p>
      </div>
    </div>
    </Portal>
  );
}
