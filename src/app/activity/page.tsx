import { auth } from "@/lib/auth";
import { getFriendsActivity, getUserActivity, type ActivityItem } from "@/lib/feed";
import ActivityTabs from "@/components/activity/ActivityTabs";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; only?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { tab, only } = await searchParams;
  const initialTab = tab === "you" || tab === "notifications" || tab === "trending" ? tab : null;
  // ?only=you — "Your diary" from the home screen: one tab, no switcher.
  const lockedTab = only === "you" ? "you" as const : null;

  let friendsActivity: ActivityItem[] = [];
  let myActivity: ActivityItem[] = [];
  if (userId) {
    try {
      // In locked "you" mode the friends feed is never rendered, so don't pay
      // for it — it's a heavy cross-region query.
      if (lockedTab === "you") {
        myActivity = await getUserActivity(userId);
      } else {
        [friendsActivity, myActivity] = await Promise.all([getFriendsActivity(userId), getUserActivity(userId)]);
      }
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-10">
      <ActivityTabs friendsActivity={friendsActivity} myActivity={myActivity} isLoggedIn={!!session} initialTab={initialTab} lockedTab={lockedTab} />
    </div>
  );
}
