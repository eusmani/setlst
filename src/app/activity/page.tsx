import { auth } from "@/lib/auth";
import { getFriendsFeed, getUserFeed, toDisplayFeed } from "@/lib/feed";
import ReviewCard from "@/components/review/ReviewCard";
import TrendingAlbums from "@/components/album/TrendingAlbums";
import Link from "next/link";

export const dynamic = "force-dynamic";

const sectionHeading = "text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-4";

export default async function ActivityPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let friends: Awaited<ReturnType<typeof getFriendsFeed>> = [];
  let mine: Awaited<ReturnType<typeof getUserFeed>> = [];
  if (userId) {
    try {
      [friends, mine] = await Promise.all([getFriendsFeed(userId), getUserFeed(userId)]);
    } catch {}
  }
  const friendsFeed = toDisplayFeed(friends, userId);
  const myFeed = toDisplayFeed(mine, userId);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
            Activity
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            What you and your friends are spinning, plus what&apos;s hot right now.
          </p>
        </div>
        <Link href="/" className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors shrink-0">
          ← Back home
        </Link>
      </div>

      <div className="space-y-10">
        {/* Section 1 — Friends' Activity */}
        {session && (
          <section>
            <h2 className={sectionHeading}>Friends&apos; Activity</h2>
            {friendsFeed.length === 0 ? (
              <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
                <p className="text-sm mb-2">No reviews from people you follow yet.</p>
                <Link href="/members" className="text-xs text-[#c4a832] hover:underline">
                  Follow friends to see their reviews here →
                </Link>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
                {friendsFeed.map((r) => (
                  <ReviewCard key={r.id} review={r} isLoggedIn={!!session} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section 2 — Your Activity */}
        {session && (
          <section>
            <h2 className={sectionHeading}>Your Activity</h2>
            {myFeed.length === 0 ? (
              <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
                <p className="text-sm mb-2">You haven&apos;t logged any reviews yet.</p>
                <Link href="/search" className="text-xs text-[#c4a832] hover:underline">
                  Find an album to log →
                </Link>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
                {myFeed.map((r) => (
                  <ReviewCard key={r.id} review={r} isLoggedIn={!!session} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Logged-out prompt for the personal sections */}
        {!session && (
          <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
            <p className="text-sm mb-2">Log in to see your activity and your friends&apos; reviews.</p>
            <Link href="/login" className="text-xs text-[#c4a832] hover:underline">
              Sign in →
            </Link>
          </div>
        )}

        {/* Section 3 — Trending (most popular albums reviewed in activity) */}
        <section>
          <TrendingAlbums
            heading="Trending"
            limit={12}
            slider
            showSeeAll
            emptyMessage="No trending albums yet — review and like albums to fill this out."
          />
        </section>
      </div>
    </div>
  );
}
