"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import TrendingAlbums from "@/components/album/TrendingAlbums";

type Tab = "friends" | "you" | "trending";

interface Props {
  friendsFeed: ReviewData[];
  myFeed: ReviewData[];
  isLoggedIn: boolean;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "friends", label: "Friends" },
  { key: "you", label: "You" },
  { key: "trending", label: "Trending" },
];

function EmptyState({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
      <p className="text-sm mb-2">{message}</p>
      <Link href={href} className="text-xs text-[#c4a832] hover:underline">{cta}</Link>
    </div>
  );
}

function ReviewList({ feed, isLoggedIn }: { feed: ReviewData[]; isLoggedIn: boolean }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
      {feed.map((r) => (
        <ReviewCard key={r.id} review={r} isLoggedIn={isLoggedIn} />
      ))}
    </div>
  );
}

export default function ActivityTabs({ friendsFeed, myFeed, isLoggedIn }: Props) {
  // No tab is open until the user clicks one.
  const [tab, setTab] = useState<Tab | null>(null);

  // Albums your friends have recently reviewed (favorites bubble up first), de-duped.
  const friendsAlbums = useMemo(() => {
    const seen = new Set<string>();
    return [...friendsFeed]
      .sort((a, b) => (b.rating - a.rating) || (b.createdAt < a.createdAt ? -1 : 1))
      .filter((r) => (seen.has(r.album.spotifyId) ? false : (seen.add(r.album.spotifyId), true)))
      .map((r) => ({
        spotifyId: r.album.spotifyId, title: r.album.title,
        artist: r.album.artist, artwork: r.album.artwork, year: null,
      }));
  }, [friendsFeed]);

  return (
    <div>
      {/* Horizontal nested tab bar (segmented control), centered on its line */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#1a1a1a] border border-[#1f1f1f]">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab((cur) => (cur === key ? null : key))}
              className={`px-4 py-1.5 text-xs uppercase tracking-[0.12em] rounded-full transition-colors ${
                tab === key
                  ? "bg-[#c4a832] text-[#111111]"
                  : "text-[#6b6b6b] hover:text-[#a0a0a0]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Nothing selected yet */}
      {tab === null && (
        <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
          <p className="text-sm">Pick a tab to see Friends, You, or Trending.</p>
        </div>
      )}

      {/* Friends */}
      {tab === "friends" && (
        !isLoggedIn ? (
          <EmptyState message="Log in to see your friends' reviews." href="/login" cta="Sign in →" />
        ) : friendsFeed.length === 0 ? (
          <EmptyState message="No reviews from people you follow yet." href="/members" cta="Follow friends to see their reviews here →" />
        ) : (
          <ReviewList feed={friendsFeed} isLoggedIn={isLoggedIn} />
        )
      )}

      {/* You */}
      {tab === "you" && (
        !isLoggedIn ? (
          <EmptyState message="Log in to see your activity." href="/login" cta="Sign in →" />
        ) : myFeed.length === 0 ? (
          <EmptyState message="You haven't logged any reviews yet." href="/search" cta="Find an album to log →" />
        ) : (
          <ReviewList feed={myFeed} isLoggedIn={isLoggedIn} />
        )
      )}

      {/* Trending */}
      {tab === "trending" && (
        <div className="space-y-7">
          <TrendingAlbums
            heading="Most popular albums reviewed"
            limit={12}
            slider
            showSeeAll
            emptyMessage="No trending albums yet — review and like albums to fill this out."
          />
          <TrendingAlbums
            heading="Popular with your friends"
            albums={friendsAlbums}
            limit={12}
            slider
            emptyMessage="Follow friends and their favorites will show up here."
          />
          <TrendingAlbums
            heading="New & hot — fresh releases"
            endpoint="/api/hot-albums"
            limit={12}
            slider
            emptyMessage="Couldn't load new releases right now."
          />
        </div>
      )}
    </div>
  );
}
