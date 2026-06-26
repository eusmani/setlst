"use client";
import { useState } from "react";
import Link from "next/link";
import TrendingAlbums from "@/components/album/TrendingAlbums";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import NewReleaseAd from "@/components/layout/NewReleaseAd";
import ReleaseRadar from "@/components/layout/ReleaseRadar";
import LocalConcerts from "@/components/layout/LocalConcerts";
import type { AddedAlbum } from "@/lib/feed";

type Tab = "albums" | "activity" | "friends" | "news";

const TABS: { key: Tab; label: string }[] = [
  { key: "albums", label: "Albums" },
  { key: "activity", label: "Activity" },
  { key: "friends", label: "Friends" },
  { key: "news", label: "News" },
];

function ReviewList({ feed, empty }: { feed: ReviewData[]; empty: { msg: string; href: string; cta: string } }) {
  if (feed.length === 0) {
    return (
      <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
        <p className="text-sm mb-2">{empty.msg}</p>
        <Link href={empty.href} className="text-xs text-[#c4a832] hover:underline">{empty.cta}</Link>
      </div>
    );
  }
  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
      {feed.map((r) => <ReviewCard key={r.id} review={r} isLoggedIn />)}
    </div>
  );
}

interface Props {
  myRecentAlbums: AddedAlbum[];
  myFeed: ReviewData[];
  friendsFeed: ReviewData[];
}

export default function MobileHome({ myRecentAlbums, myFeed, friendsFeed }: Props) {
  const [tab, setTab] = useState<Tab>("albums");

  return (
    <div>
      {/* Horizontal nested tab bar — Spotify/Letterboxd-style scrollable chips */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#111111]/90 backdrop-blur supports-[backdrop-filter]:bg-[#111111]/70 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2 w-max">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 text-xs uppercase tracking-[0.1em] rounded-full border transition-colors whitespace-nowrap ${
                tab === key
                  ? "bg-[#c4a832] border-[#c4a832] text-[#111111]"
                  : "bg-[#1a1a1a] border-[#1f1f1f] text-[#a0a0a0] hover:text-[#f0f0f0]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {tab === "albums" && (
          <div className="space-y-6">
            <TrendingAlbums
              albums={myRecentAlbums}
              limit={12}
              slider
              heading="Your recent activity"
              showSeeAll
              seeAllHref="/activity"
              emptyMessage="You haven't added any albums yet. Log or save one and it'll show up here."
            />
            <TrendingAlbums
              limit={12}
              slider
              heading="Popular This Week"
              emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
            />
          </div>
        )}

        {tab === "activity" && (
          <ReviewList feed={myFeed} empty={{ msg: "You haven't reviewed any albums yet.", href: "/search", cta: "Find an album to review →" }} />
        )}

        {tab === "friends" && (
          <ReviewList feed={friendsFeed} empty={{ msg: "No reviews from people you follow yet.", href: "/members", cta: "Follow friends →" }} />
        )}

        {tab === "news" && (
          <div className="space-y-5">
            <NewReleaseAd />
            <ReleaseRadar />
            <LocalConcerts />
          </div>
        )}
      </div>
    </div>
  );
}
