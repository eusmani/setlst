"use client";
import { useState } from "react";
import Link from "next/link";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";

// Desktop: full review cards. Mobile: a grid of album-cover squares (max 6, then
// "See more") — tapping one opens the full review in a centered modal.
export default function ReviewsGrid({ reviews, isLoggedIn, username }: { reviews: ReviewData[]; isLoggedIn: boolean; username: string }) {
  const [selected, setSelected] = useState<ReviewData | null>(null);

  return (
    <>
      {/* Desktop — full cards */}
      <div className="hidden sm:block bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl px-4">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {/* Mobile — album-cover grid (max 6) */}
      <div className="sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          {reviews.slice(0, 6).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="relative aspect-square rounded-lg overflow-hidden border border-[#1f1f1f] active:scale-[0.98] transition-transform"
            >
              {r.album.artwork ? (
                <img src={r.album.artwork} alt={r.album.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#222222]" />
              )}
              <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-[#f0f0f0]">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#c4a832"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                {r.rating}
              </span>
            </button>
          ))}
        </div>
        {reviews.length > 6 && (
          <div className="mt-3 flex justify-center">
            <Link href={`/profile/${username}/albums-reviewed`}
              className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full px-4 py-2 transition-colors">
              See more
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile — review modal */}
      {selected && (
        <div
          className="sm:hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[82vh] overflow-y-auto overscroll-contain bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl px-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-[#d0d0d0] hover:text-[#f0f0f0]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
            </button>
            <ReviewCard review={selected} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      )}
    </>
  );
}
