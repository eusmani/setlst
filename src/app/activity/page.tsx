import { auth } from "@/lib/auth";
import { getFriendsFeed, getUserFeed, toDisplayFeed } from "@/lib/feed";
import ActivityTabs from "@/components/activity/ActivityTabs";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { tab } = await searchParams;
  const initialTab = tab === "you" || tab === "friends" || tab === "trending" ? tab : null;

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
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0f0f0]">
          Activity
        </h1>
        <p className="text-sm text-[#6b6b6b] mt-1">
          What you and your friends are spinning, plus what&apos;s hot right now.
        </p>
      </div>

      <ActivityTabs friendsFeed={friendsFeed} myFeed={myFeed} isLoggedIn={!!session} initialTab={initialTab} />
    </div>
  );
}
