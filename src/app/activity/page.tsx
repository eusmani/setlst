import { auth } from "@/lib/auth";
import { getFeed, toDisplayFeed } from "@/lib/feed";
import ReviewCard from "@/components/review/ReviewCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  let feed: Awaited<ReturnType<typeof getFeed>> = [];
  try { feed = await getFeed(session?.user?.id, 200); } catch {}
  const displayFeed = toDisplayFeed(feed, session?.user?.id);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f0f0f0]" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
          Friends&apos; Activity
        </h1>
        <Link href="/" className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
          ← Back home
        </Link>
      </div>

      {displayFeed.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
          <p className="text-sm mb-2">No reviews yet.</p>
          {session ? (
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
        <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
          {displayFeed.map((r) => (
            <ReviewCard key={r.id} review={r} isLoggedIn={!!session} />
          ))}
        </div>
      )}
    </div>
  );
}
