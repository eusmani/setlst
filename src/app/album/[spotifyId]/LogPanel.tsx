"use client";
import { useEffect, useState } from "react";
import Portal from "@/components/ui/Portal";
import ReviewForm from "./ReviewForm";
import type { ReviewDraft } from "./AlbumClient";

interface Album {
  spotifyId: string; title: string; artist: string;
  artwork?: string | null; year?: number | null; genres?: string[];
}

interface Props {
  album: Album;
  trackNames: string[];
  initialReview: ReviewDraft | null;
  isLoggedIn: boolean;
  autoOpenReview?: boolean; // open the composer immediately (e.g. from the + flow)
}

export default function LogPanel({ album, trackNames, initialReview, isLoggedIn, autoOpenReview }: Props) {
  const [myReview, setMyReview] = useState(initialReview);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Land here from the "+" review flow → open the composer right away.
  useEffect(() => {
    if (autoOpenReview && isLoggedIn) setEditing(true);
  }, [autoOpenReview, isLoggedIn]);

  function onSaved(r: ReviewDraft) {
    setMyReview(r);
    setEditing(false);
  }

  async function onDelete() {
    if (!confirm("Delete your review for this album?")) return;
    setDeleting(true);
    await fetch(`/api/reviews?albumId=${encodeURIComponent(album.spotifyId)}`, { method: "DELETE" });
    setDeleting(false);
    setMyReview(null);
  }

  return (
    <>
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-4">
        <h2 className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">
          {myReview ? "Your Log" : "Log this Album"}
        </h2>

        {!isLoggedIn ? (
          <ReviewForm album={album} trackNames={trackNames} existing={myReview} onSaved={onSaved} />
        ) : myReview ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">Edit review</button>
            <button onClick={onDelete} disabled={deleting} className="text-xs text-[#6b6b6b] hover:text-red-400 transition-colors disabled:opacity-50">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] text-sm py-2.5 rounded-lg transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {/* Review composer — pop-up modal for a roomier writing space */}
      {editing && isLoggedIn && (
        <Portal>
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center px-4 py-8 bg-black/70 overflow-y-auto" onClick={() => setEditing(false)}>
          <div className="w-full max-w-xl bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-[#f0f0f0]">{myReview ? "Edit your review" : `Review ${album.title}`}</h2>
              <button onClick={() => setEditing(false)} aria-label="Close" className="text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" /></svg>
              </button>
            </div>
            <ReviewForm album={album} trackNames={trackNames} existing={myReview} onSaved={onSaved} onClose={() => setEditing(false)} />
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
