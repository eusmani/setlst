"use client";
import { useState } from "react";
import ShareSheet from "./ShareSheet";
import type { StoryPayload } from "@/lib/story";

interface Props {
  reviewId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: number; // 1 | -1 | 0
  isLoggedIn: boolean;
  shareUrl: string;
  shareText: string;
  /** Everything the Instagram-story card needs to draw this review. */
  story: StoryPayload;
}

export default function ReviewVotes({
  reviewId, initialLikes, initialDislikes, initialMyVote, isLoggedIn, shareUrl, shareText, story,
}: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [sharing, setSharing] = useState(false);

  async function vote(value: 1 | -1) {
    if (!isLoggedIn) return;
    // optimistic
    const prev = { likes, dislikes, myVote };
    let nl = likes, nd = dislikes, nv: number;
    if (myVote === value) { nv = 0; if (value === 1) nl--; else nd--; }
    else {
      nv = value;
      if (value === 1) { nl++; if (myVote === -1) nd--; }
      else { nd++; if (myVote === 1) nl--; }
    }
    setLikes(nl); setDislikes(nd); setMyVote(nv);

    const res = await fetch("/api/reviews/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, value }),
    });
    if (res.ok) {
      const d = await res.json();
      setLikes(d.likeCount); setDislikes(d.dislikeCount); setMyVote(d.myVote);
    } else {
      setLikes(prev.likes); setDislikes(prev.dislikes); setMyVote(prev.myVote);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => vote(1)}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 text-xs transition-colors ${
          myVote === 1 ? "text-[#c4a832]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"
        } ${!isLoggedIn ? "cursor-default" : ""}`}
        aria-label="Like"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={myVote === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
        </svg>
        {likes > 0 && likes}
      </button>

      <button
        onClick={() => vote(-1)}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 text-xs transition-colors ${
          myVote === -1 ? "text-[#9d6b6b]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"
        } ${!isLoggedIn ? "cursor-default" : ""}`}
        aria-label="Dislike"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={myVote === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />
        </svg>
        {dislikes > 0 && dislikes}
      </button>

      <button
        onClick={() => setSharing(true)}
        className="flex items-center gap-1 text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
        aria-label="Share this review"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {sharing && (
        <ShareSheet
          payload={story}
          link={shareUrl}
          shareText={shareText}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
