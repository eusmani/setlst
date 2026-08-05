"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ReportDialog from "./ReportDialog";
import { tapHaptic } from "@/lib/native";
import type { ReportableType } from "@/lib/reportTypes";

interface Props {
  contentType: ReportableType;
  /** Id of the item — the username when contentType is "user". */
  contentId: string;
  /** Author of the content, so we can offer "Block @them". */
  authorUsername?: string | null;
  /** What the sheet calls this, e.g. "this review". */
  label?: string;
  /** Called after a successful block, so the parent can drop the item. */
  onBlocked?: () => void;
  className?: string;
}

// The "…" control attached to every piece of user-generated content. Guideline
// 1.2 requires both a way to report objectionable content and a way to block
// abusive users, reachable from the content itself.
export default function ContentMenu({
  contentType,
  contentId,
  authorUsername,
  label = "this content",
  onBlocked,
  className = "",
}: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nothing to report on your own posts.
  const isMine = !!authorUsername && session?.user?.username === authorUsername;
  if (!session || isMine) return null;

  async function block() {
    if (!authorUsername) return;
    setBlocking(true);
    tapHaptic();
    try {
      const res = await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authorUsername }),
      });
      if (res.ok) {
        setOpen(false);
        setConfirmBlock(false);
        onBlocked?.();
      }
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`More options for ${label}`}
        className="px-2 py-1 text-[#6b6b6b] hover:text-[#c4a832] transition-colors leading-none"
      >
        ···
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg overflow-hidden shadow-xl">
          <button
            onClick={() => { setOpen(false); setReporting(true); }}
            className="w-full text-left px-3 py-2.5 text-sm text-[#d8d8d8] hover:bg-[#222222] transition-colors"
          >
            Report {label}
          </button>

          {authorUsername && (
            confirmBlock ? (
              <div className="px-3 py-2.5 border-t border-[#2e2e2e]">
                <p className="text-xs text-[#a0a0a0] mb-2 leading-snug">
                  Block @{authorUsername}? You won&apos;t see each other&apos;s posts, and they
                  can&apos;t message or follow you.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={block}
                    disabled={blocking}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-1.5 rounded text-xs transition-colors"
                  >
                    {blocking ? "Blocking…" : "Block"}
                  </button>
                  <button
                    onClick={() => setConfirmBlock(false)}
                    className="px-3 border border-[#2e2e2e] hover:border-[#555] text-[#a0a0a0] rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBlock(true)}
                className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-[#222222] border-t border-[#2e2e2e] transition-colors"
              >
                Block @{authorUsername}
              </button>
            )
          )}
        </div>
      )}

      {reporting && (
        <ReportDialog
          contentType={contentType}
          contentId={contentId}
          label={label}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
