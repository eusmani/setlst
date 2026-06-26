import { auth } from "@/lib/auth";
import { getFeed, getFriendsFeed, getUserFeed, getUserAddedAlbums, toDisplayFeed, type AddedAlbum } from "@/lib/feed";
import MobileActivitySection from "@/components/home/MobileActivitySection";
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
  let feed: Awaited<ReturnType<typeof getFeed>> = [];
  try { feed = await getFeed(session?.user?.id); } catch {}

  const displayFeed = toDisplayFeed(feed, session?.user?.id);

  // Albums the logged-in user has recently added (reviewed or saved), most
  // recent first — rendered in the same slider layout as "Popular This Week".
  let myRecentAlbums: AddedAlbum[] = [];
  let myFeed: ReturnType<typeof toDisplayFeed> = [];
  let friendsFeed: ReturnType<typeof toDisplayFeed> = [];
  if (session?.user?.id) {
    try {
      const [added, mine, friends] = await Promise.all([
        getUserAddedAlbums(session.user.id, 24),
        getUserFeed(session.user.id, 30),
        getFriendsFeed(session.user.id, 30),
      ]);
      myRecentAlbums = added;
      myFeed = toDisplayFeed(mine, session.user.id);
      friendsFeed = toDisplayFeed(friends, session.user.id);
    } catch {}
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
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-5 pt-8 sm:pt-12 pb-5 sm:pb-8">
            <h2 className="slide-down text-2xl sm:text-3xl font-bold text-[#f0f0f0]" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
              Welcome back, <span className="text-[#c4a832]">{session.user.username}</span>!
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
          <TrendingAlbums
            limit={12}
            slider
            heading="Popular This Week"
            emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
          />
          {session ? (
            <>
              <MobileActivitySection
                heading="Your Activity"
                feed={myFeed}
                href="/activity?tab=you"
                empty={{ msg: "You haven't reviewed any albums yet.", href: "/search", cta: "Find an album to review →" }}
              />
              <MobileActivitySection
                heading="Friends' Activity"
                feed={friendsFeed}
                href="/activity?tab=friends"
                empty={{ msg: "No reviews from people you follow yet.", href: "/members", cta: "Follow friends to see their reviews →" }}
              />
            </>
          ) : (
            <MobileActivitySection
              heading="Recent Activity"
              feed={displayFeed}
              href="/activity"
              empty={{ msg: "No activity yet.", href: "/register", cta: "Join to start logging albums →" }}
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
            {session && (
              <TrendingAlbums
                albums={myRecentAlbums}
                limit={12}
                slider
                heading="Your recent activity"
                showSeeAll
                seeAllHref="/activity"
                emptyMessage="You haven't added any albums yet. Log or save one and it'll show up here."
              />
            )}
            {/* Popular This Week — desktop only; mobile keeps a simpler home */}
            <div className="hidden lg:block">
              <TrendingAlbums
                limit={12}
                slider
                heading="Popular This Week"
                emptyMessage="Nothing here yet! Log your favorite albums in and start the chain."
              />
            </div>
            <div>
              <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Friends&apos; Activity</h2>
              {/* Logged-in: only people you follow (never your own activity). Logged-out: recent site-wide. */}
              <HomeFeed feed={session ? friendsFeed : displayFeed} isLoggedIn={!!session} />
            </div>
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
