import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserActivity, getFriendsActivity, getRecentActivity, type ActivityItem } from "@/lib/feed";
import MobileActivitySection from "@/components/home/MobileActivitySection";
import ClubsStrip from "@/components/home/ClubsStrip";
import SpotifyForYou from "@/components/home/SpotifyForYou";
import Link from "next/link";
import HomeFeed from "./HomeFeed";
import AlbumMosaic from "@/components/layout/AlbumMosaic";
import ReleaseRadar from "@/components/layout/ReleaseRadar";
import LocalConcerts from "@/components/layout/LocalConcerts";
import AnniversaryBanner from "@/components/layout/AnniversaryBanner";
import NewReleaseAd from "@/components/layout/NewReleaseAd";
import TrendingAlbums from "@/components/album/TrendingAlbums";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  // Activity = reviews + discussion threads, merged. Recent (site-wide) for
  // logged-out; your own + friends' for logged-in.
  let recentActivity: ActivityItem[] = [];
  let myActivity: ActivityItem[] = [];
  let friendsActivity: ActivityItem[] = [];
  // Current username from the DB (the JWT token can be stale after a rename).
  let username = session?.user?.username ?? "";
  if (session?.user?.id) {
    try {
      const [mine, friends, me] = await Promise.all([
        getUserActivity(session.user.id, 30),
        getFriendsActivity(session.user.id, 30),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } }),
      ]);
      myActivity = mine;
      friendsActivity = friends;
      if (me) username = me.username;
    } catch {}
  } else {
    try { recentActivity = await getRecentActivity(20); } catch {}
  }

  return (
    <div className="relative">
      <AlbumMosaic />
      {!session && (
        <div className="relative">
          <div className="relative z-10 max-w-4xl mx-auto px-5 py-12 sm:py-20">
            <h1 className="slide-down text-3xl sm:text-5xl font-bold text-[#f0f0f0] leading-tight mb-3 sm:mb-4" style={{ fontFamily: "var(--font-jakarta)" }}>
              Your all-in-one music database<br />
              <span className="text-[#c4a832]">and review hub.</span>
            </h1>
            <p className="slide-down-delay hero-sub text-[#a0a0a0] text-sm max-w-md mb-6 sm:mb-7 leading-relaxed">
              Track every album you listen to, rate your favorites, explore complete discographies, and discover the next new artist in your rotation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] px-5 py-2.5 rounded text-sm transition-colors"
              >
                Create account
              </Link>
              <Link
                href="/search"
                className="border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#f0f0f0] px-5 py-2.5 rounded text-sm transition-colors"
              >
                Browse albums
              </Link>
            </div>
          </div>
        </div>
      )}

      {session && (
        <div className="relative">
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-5 pt-3 sm:pt-8 pb-3 sm:pb-6">
            <h2 className="slide-down text-2xl sm:text-3xl font-bold text-[#f0f0f0]" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
              Welcome back, <span className="text-[#c4a832]">{username}</span>!
            </h2>
            <p className="slide-down-delay hero-sub text-sm sm:text-base text-[#a0a0a0] mt-1.5">
              Check your friends&apos; picks and log in new albums.
            </p>
          </div>
        </div>
      )}

      <div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-5 pb-12 ${session ? "pt-4" : "py-8 sm:py-10"}`}>
        {/* Mobile: Your / Friends' activity (preview 3, expandable) + discovery widgets */}
        <div className="lg:hidden space-y-6">
          {session && <SpotifyForYou />}
          <TrendingAlbums
            limit={12}
            slider
            heading="Popular This Week"
            emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
          />
          {/* Friends' Activity — above Grails */}
          {session ? (
            <MobileActivitySection
              heading="Friends' Activity"
              items={friendsActivity}
              href="/activity?tab=friends"
              empty={{ msg: "No activity from people you follow yet.", href: "/members", cta: "Follow friends to see their activity →" }}
            />
          ) : (
            <MobileActivitySection
              heading="Recent Activity"
              items={recentActivity}
              href="/activity"
              empty={{ msg: "No activity yet.", href: "/register", cta: "Join to start logging albums →" }}
            />
          )}

          <ClubsStrip />

          {session && (
            <MobileActivitySection
              heading="Your Activity"
              items={myActivity}
              href="/activity?tab=you"
              empty={{ msg: "You haven't posted anything yet.", href: "/search", cta: "Find an album to review or discuss →" }}
            />
          )}

          <ReleaseRadar />
          <LocalConcerts />
          {/* On This Day — pinned to the bottom of the mobile home */}
          <AnniversaryBanner />
        </div>

        {/* Desktop */}
        <div className="hidden lg:block">
        {session && <div className="hidden lg:block mb-5 sm:mb-6"><NewReleaseAd /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          {/* Main column */}
          <section className="lg:col-span-2 space-y-5 sm:space-y-6 min-w-0">
            {/* Popular This Week — desktop only; mobile keeps a simpler home */}
            <div className="hidden lg:block">
              <TrendingAlbums
                limit={12}
                slider
                heading="Popular This Week"
                emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
              />
            </div>
            {/* Friends' Activity — above Grails */}
            <div>
              <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Friends&apos; Activity</h2>
              {/* Logged-in: only people you follow (never your own activity). Logged-out: recent site-wide. */}
              <HomeFeed items={session ? friendsActivity : recentActivity} isLoggedIn={!!session} />
            </div>
            <ClubsStrip />
            {session && (
              <div>
                <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Your recent activity</h2>
                {/* Reviews + discussion posts + replies — not just albums. */}
                <HomeFeed items={myActivity} isLoggedIn={!!session} />
              </div>
            )}
            <div className="hidden lg:block"><AnniversaryBanner /></div>
          </section>

          {/* Sidebar widgets — desktop only */}
          <aside className="hidden lg:block space-y-5 min-w-0">
            <ReleaseRadar />
            <LocalConcerts />
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
}
