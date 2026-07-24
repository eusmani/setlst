"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import ActivityList from "@/components/activity/ActivityList";
import TrendingAlbums from "@/components/album/TrendingAlbums";
import ClubsStrip from "@/components/home/ClubsStrip";
import type { ActivityItem } from "@/lib/feed";

type Tab = "friends" | "you" | "trending";

interface Props {
  friendsActivity: ActivityItem[];
  myActivity: ActivityItem[];
  isLoggedIn: boolean;
  initialTab?: Tab | null;
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

function FeedList({ items, isLoggedIn }: { items: ActivityItem[]; isLoggedIn: boolean }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
      <ActivityList items={items} isLoggedIn={isLoggedIn} />
    </div>
  );
}

export default function ActivityTabs({ friendsActivity, myActivity, isLoggedIn, initialTab = null }: Props) {
  // Opens to the tab passed via ?tab= (e.g. from the home screen), else nothing until clicked.
  const [tab, setTab] = useState<Tab | null>(initialTab);

  // Albums your friends have recently reviewed (favorites bubble up first), de-duped.
  const friendsAlbums = useMemo(() => {
    const seen = new Set<string>();
    return friendsActivity
      .flatMap((it) => (it.kind === "review" ? [it.review] : []))
      .sort((a, b) => (b.rating - a.rating) || (b.createdAt < a.createdAt ? -1 : 1))
      .filter((r) => (seen.has(r.album.spotifyId) ? false : (seen.add(r.album.spotifyId), true)))
      .map((r) => ({
        spotifyId: r.album.spotifyId, title: r.album.title,
        artist: r.album.artist, artwork: r.album.artwork, year: null,
      }));
  }, [friendsActivity]);

  return (
    <div>
      {/* Horizontal nested tab bar (segmented control) — spans the column so the
          three tabs split it evenly instead of huddling in the middle */}
      <div className="mb-6">
        <div className="flex w-full items-center gap-1 p-1 rounded-full bg-[#1a1a1a] border border-[#1f1f1f]">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              data-control
              onClick={() => setTab((cur) => (cur === key ? null : key))}
              className={`flex-1 px-4 py-2 text-xs uppercase tracking-[0.12em] rounded-full transition-colors ${
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
          <EmptyState message="Log in to see your friends' activity." href="/login" cta="Sign in →" />
        ) : friendsActivity.length === 0 ? (
          <EmptyState message="No activity from people you follow yet." href="/members" cta="Follow friends to see their activity here →" />
        ) : (
          <FeedList items={friendsActivity} isLoggedIn={isLoggedIn} />
        )
      )}

      {/* You */}
      {tab === "you" && (
        !isLoggedIn ? (
          <EmptyState message="Log in to see your activity." href="/login" cta="Sign in →" />
        ) : myActivity.length === 0 ? (
          <EmptyState message="You haven't posted any activity yet." href="/search" cta="Find an album to review or discuss →" />
        ) : (
          <FeedList items={myActivity} isLoggedIn={isLoggedIn} />
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
          <ClubsStrip />
        </div>
      )}
    </div>
  );
}
