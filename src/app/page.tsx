import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeGreeting from "@/components/home/HomeGreeting";
import { GREETING_COOKIE, GREETINGS } from "@/lib/greetings";
import { getUserActivity, getFriendsActivity, getRecentActivity } from "@/lib/feed";
import { cache, Suspense } from "react";
import MobileFeed from "@/components/home/MobileFeed";
import QuickTiles from "@/components/home/QuickTiles";
import ClubsStrip from "@/components/home/ClubsStrip";
import SpotifyForYou from "@/components/home/SpotifyForYou";
import ReleaseFilterPills from "@/components/home/ReleaseFilterPills";
import Link from "next/link";
import HomeFeed from "./HomeFeed";
import AlbumMosaic from "@/components/layout/AlbumMosaic";
import ReleaseRadar from "@/components/layout/ReleaseRadar";
import LocalConcerts from "@/components/layout/LocalConcerts";
import AnniversaryBanner from "@/components/layout/AnniversaryBanner";
import NewReleaseAd from "@/components/layout/NewReleaseAd";
import { SPOTIFY_PROMOS_ENABLED } from "@/lib/promos";
import TrendingAlbums from "@/components/album/TrendingAlbums";

export const dynamic = "force-dynamic";


// The activity feed is a heavy multi-relation query against a cross-region Turso
// DB (~5s) — it used to block the whole home render. It's now streamed via
// <Suspense> so the hero + discovery widgets paint instantly. cache() dedupes the
// fetch across the mobile + desktop layouts (both render the same feed).
const cachedFriends = cache((id: string) => getFriendsActivity(id, 30));
const cachedMine = cache((id: string) => getUserActivity(id, 30));
const cachedRecent = cache(() => getRecentActivity(20));

function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
      ))}
    </div>
  );
}

async function MobilePrimaryFeed({ userId }: { userId?: string }) {
  if (userId) {
    return <MobileFeed items={await cachedFriends(userId)} empty={{ msg: "No activity from people you follow yet.", href: "/members", cta: "Follow friends to see their activity →" }} />;
  }
  return <MobileFeed items={await cachedRecent()} empty={{ msg: "No activity yet.", href: "/register", cta: "Join to start logging albums →" }} />;
}

async function MobileMyFeed({ userId, username }: { userId: string; username: string }) {
  return (
    <MobileFeed
      items={await cachedMine(userId)}
      limit={3}
      // Opens the full "Albums reviewed" list on its own screen rather than
      // growing the home screen.
      moreHref={username ? `/profile/${username}/albums-reviewed` : "/activity?tab=you&only=you"}
      empty={{ msg: "You haven't posted anything yet.", href: "/search", cta: "Find an album to review or discuss →" }}
    />
  );
}

async function DesktopPrimaryFeed({ userId }: { userId?: string }) {
  const items = userId ? await cachedFriends(userId) : await cachedRecent();
  return <HomeFeed items={items} isLoggedIn={!!userId} />;
}

async function DesktopMyFeed({ userId }: { userId: string }) {
  return <HomeFeed items={await cachedMine(userId)} isLoggedIn={true} />;
}

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  // Read the username fresh rather than trusting the token, which goes stale
  // after a rename — same reason /profile resolves it server-side. A stale name
  // here built a "See more" link to /profile/<old-name>/albums-reviewed, a
  // profile that no longer exists.
  const username = userId
    ? (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        })
      )?.username ?? ""
    : "";

  // Render the greeting the client pinned for this session, so the first paint
  // is already right. On a fresh launch there's no cookie yet and HomeGreeting
  // picks one; a random default here keeps that first-ever load varied.
  const cookieStore = await cookies();
  const stored = Number(cookieStore.get(GREETING_COOKIE)?.value);
  const greetingIndex = Number.isNaN(stored)
    ? Math.floor(Math.random() * GREETINGS.length)
    : stored;

  return (
    <div className="relative">
      <AlbumMosaic />
      {!session && (
        <div className="relative">
          <div className="relative z-10 max-w-4xl mx-auto px-5 py-12 sm:py-20">
            {/* Phones get one line instead of the pitch — two paragraphs of
                marketing above the fold is a landing page, not an app. The full
                version stays on the web, where a first-time visitor arrives with
                no other context.

                Sized in vw with a nowrap so it holds one line at every phone
                width instead of breaking after "join?" on the narrow ones; the
                clamp keeps it legible on a small screen without letting it grow
                past a comfortable size on a large one. */}
            <h1
              className="slide-down sm:hidden font-bold text-[#f0f0f0] leading-tight mb-5 whitespace-nowrap"
              style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(15px, 4.6vw, 22px)" }}
            >
              Looking to join?{" "}
              <span className="text-[#c4a832]">Sign in or sign up!</span>
            </h1>

            {/* The two auth buttons live here on phones, under the line that
                refers to them, rather than in the top corner. */}
            <div className="sm:hidden flex items-center gap-2.5 mb-2">
              <Link
                href="/login"
                className="flex-1 text-center text-sm font-bold text-[#f0f0f0] border border-[#3a3a3a] px-4 py-2.5 rounded-full transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center text-sm font-bold bg-[#f0f0f0] text-[#111111] px-4 py-2.5 rounded-full transition-colors"
              >
                Sign up
              </Link>
            </div>
            <h1 className="slide-down hidden sm:block text-3xl sm:text-5xl font-bold text-[#f0f0f0] leading-tight mb-3 sm:mb-4" style={{ fontFamily: "var(--font-jakarta)" }}>
              Your all-in-one music database<br />
              <span className="text-[#c4a832]">and review hub.</span>
            </h1>
            <p className="slide-down-delay hero-sub hidden sm:block text-[#a0a0a0] text-sm max-w-md mb-6 sm:mb-7 leading-relaxed">
              Track every album you listen to, rate your favorites, explore complete discographies, and discover the next new artist in your rotation.
            </p>
            {/* Desktop keeps the pitch and its call to action. On phones these
                are gone: "Create account" only repeated the Sign up button now
                sitting directly above, and Browse albums duplicates the Albums
                tab in the bar at the bottom of the screen. */}
            <div className="hidden sm:flex flex-wrap gap-3">
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
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-5 pt-10 sm:pt-8 pb-4 sm:pb-6">
            <h2 className="slide-down text-[27px] sm:text-3xl font-bold text-[#f0f0f0] leading-tight" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
              <HomeGreeting username={username} initialIndex={greetingIndex} />
            </h2>
            <p className="slide-down-delay hero-sub hidden sm:block sm:text-base text-[#a0a0a0] mt-1">
              Check your friends&apos; picks and log in new albums.
            </p>
          </div>
        </div>
      )}

      <div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-5 pb-12 ${session ? "pt-1 sm:pt-4" : "py-8 sm:py-10"}`}>
        {/* Mobile: Your / Friends' activity (preview 3, expandable) + discovery widgets */}
        {/* Spotify: the connect prompt inside is web-only (hidden sm:flex) and the
            for-you rails are mobile-only (sm:hidden), so this is mounted once
            here rather than in either layout branch — two mounts would just
            double the status fetch. */}
        {session && <div className="mb-5 sm:mb-6"><SpotifyForYou /></div>}

        {/* Mobile home, in the shape of the apps people already use: shortcuts
            for what you came to do, one browsable shelf, then the feed as the
            main event. Discovery widgets sit below it rather than pushing it
            off-screen — previously nine stacked sections meant the actual
            content started three scrolls down. */}
        <div className="lg:hidden space-y-4">
          {session && <QuickTiles />}

          <TrendingAlbums
            limit={12}
            slider
            heading="Popular This Week"
            emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
          />

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="section-heading">
                {userId ? "From your friends" : "Recent activity"}
              </h2>
            </div>
            <Suspense fallback={<FeedSkeleton />}>
              <MobilePrimaryFeed userId={userId} />
            </Suspense>
          </section>

          {/* Discovery, below the feed. */}
          <ReleaseFilterPills />
          <ClubsStrip />

          {userId && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="section-heading">
                  Your activity
                </h2>
              </div>
              <Suspense fallback={<FeedSkeleton />}>
                <MobileMyFeed userId={userId} username={username} />
              </Suspense>
            </section>
          )}

          <ReleaseRadar />
          <LocalConcerts />
          {/* On This Day is desktop-only — it renders further down in the
              sidebar column, where there's room for it. */}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block">
        {SPOTIFY_PROMOS_ENABLED && session && <div className="hidden lg:block mb-5 sm:mb-6"><NewReleaseAd /></div>}

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
              <h2 className="section-heading mb-3">Friends&apos; Activity</h2>
              {/* Logged-in: only people you follow (never your own activity). Logged-out: recent site-wide. Streamed. */}
              <Suspense fallback={<FeedSkeleton />}>
                <DesktopPrimaryFeed userId={userId} />
              </Suspense>
            </div>
            <ClubsStrip />
            {userId && (
              <div>
                <h2 className="section-heading mb-3">Your recent activity</h2>
                {/* Reviews + discussion posts + replies — not just albums. */}
                <Suspense fallback={<FeedSkeleton />}>
                  <DesktopMyFeed userId={userId} />
                </Suspense>
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
