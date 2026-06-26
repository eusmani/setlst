import { auth } from "@/lib/auth";
import { getFriendsFeed, getUserFeed, toDisplayFeed } from "@/lib/feed";
import ActivityTabs from "@/components/activity/ActivityTabs";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

      <ActivityTabs friendsFeed={friendsFeed} myFeed={myFeed} isLoggedIn={!!session} />
    </div>
  );
}
