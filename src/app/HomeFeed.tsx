"use client";
import { useState, useEffect } from "react";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import AlbumCard from "@/components/album/AlbumCard";
import { SAMPLE_ALBUMS } from "@/lib/sampleData";
import Link from "next/link";

interface Rec {
  album: { id: string; spotifyId: string; title: string; artist: string; artwork: string | null; year: number | null };
  avgRating: number | null;
  reviewCount: number;
}

interface Props {
  feed: ReviewData[];
  isLoggedIn: boolean;
}

type Tab = "feed" | "recommended";

export default function HomeFeed({ feed, isLoggedIn }: Props) {
  const [tab, setTab] = useState<Tab>("feed");
  const [recs, setRecs] = useState<Rec[]>([]);
  const [recsLoaded, setRecsLoaded] = useState(false);
  // Friends' Activity previews the 3 most recent reviews; "See more" opens the full list.
  const FEED_PREVIEW = 3;

  useEffect(() => {
    if (tab === "recommended" && !recsLoaded) {
      fetch("/api/recommendations")
        .then((r) => r.json())
        .then((d) => { setRecs(Array.isArray(d) ? d : []); setRecsLoaded(true); });
    }
  }, [tab, recsLoaded]);

  const showSampleRecs = recsLoaded && recs.length === 0;
  const displayRecs = showSampleRecs ? SAMPLE_ALBUMS : recs.map((r) => ({
    spotifyId: r.album.spotifyId, title: r.album.title, artist: r.album.artist,
    artwork: r.album.artwork, year: r.album.year,
    avgRating: r.avgRating ?? undefined, reviewCount: r.reviewCount,
  }));

  const TABS: { key: Tab; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "recommended", label: "Recommended" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#1f1f1f]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs uppercase tracking-[0.12em] border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-[#c4a832] text-[#c4a832]"
                : "border-transparent text-[#6b6b6b] hover:text-[#a0a0a0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {tab === "feed" && (
        <>
          {feed.length === 0 ? (
            <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
              <p className="text-sm mb-2">No reviews yet.</p>
              {isLoggedIn ? (
                <Link href="/members" className="text-xs text-[#c4a832] hover:underline">
                  Follow friends to see their reviews here →
                </Link>
              ) : (
                <Link href="/register" className="text-xs text-[#c4a832] hover:underline">
                  Join to start logging albums →
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
                {feed.slice(0, FEED_PREVIEW).map((r) => <ReviewCard key={r.id} review={r} isLoggedIn={isLoggedIn} />)}
              </div>
              {feed.length > FEED_PREVIEW && (
                <div className="mt-4 text-center">
                  <Link
                    href="/activity"
                    className="inline-block text-xs uppercase tracking-[0.12em] text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] px-5 py-2.5 rounded-lg transition-colors"
                  >
                    See more
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Recommended */}
      {tab === "recommended" && (
        <>
          {!recsLoaded ? (
            <div className="py-12 text-center text-[#6b6b6b] text-sm">Loading…</div>
          ) : (
            <>
              {showSampleRecs && (
                <p className="text-xs text-[#6b6b6b] mb-4">
                  {isLoggedIn
                    ? "Follow members to get personalised picks. Showing underground picks for now."
                    : "Underground picks across hip-hop, shoegaze, post-punk, lo-fi, and more."}
                </p>
              )}
              {isLoggedIn && !showSampleRecs && (
                <p className="text-xs text-[#6b6b6b] mb-4">Underground albums highly rated by people you follow.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayRecs.map((a) => (
                  <AlbumCard
                    key={a.spotifyId} spotifyId={a.spotifyId} title={a.title}
                    artist={a.artist} artwork={a.artwork ?? null} year={a.year ?? null}
                    avgRating={"avgRating" in a ? (a.avgRating ?? null) : null}
                    reviewCount={"reviewCount" in a ? a.reviewCount : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
