"use client";
import { useEffect, useState } from "react";
import ShareSheet from "@/components/review/ShareSheet";
import { ratingTier } from "@/lib/rating";

interface Album { spotifyId: string; title: string; artist: string; artwork?: string | null }
interface Review { rating: number; subject?: string | null; body?: string | null }

// Entry point for sharing *your own* review of this album — opens the same share
// sheet the review cards use, with "Share to Instagram Story" on top.
export default function ShareStoryButton({ album, review }: { album: Album; review: Review }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.username) setUsername(d.username); }).catch(() => {});
  }, []);

  const tier = ratingTier(review.rating);
  const path = `/album/${album.spotifyId}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#c4a832] text-[#f0f0f0] text-sm py-2.5 rounded-lg transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
        Share to Instagram Story
      </button>

      {open && (
        <ShareSheet
          payload={{
            title: album.title,
            artist: album.artist,
            artwork: album.artwork,
            rating: review.rating,
            subject: review.subject,
            body: review.body,
            username,
            path,
          }}
          link={path}
          shareText={`${album.title} — ${tier.letter} · ${tier.word}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
