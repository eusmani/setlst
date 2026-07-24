import { auth } from "@/lib/auth";
import { getFriendsActivity, getUserActivity, type ActivityItem } from "@/lib/feed";
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

  let friendsActivity: ActivityItem[] = [];
  let myActivity: ActivityItem[] = [];
  if (userId) {
    try {
      [friendsActivity, myActivity] = await Promise.all([getFriendsActivity(userId), getUserActivity(userId)]);
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-10">
      <ActivityTabs friendsActivity={friendsActivity} myActivity={myActivity} isLoggedIn={!!session} initialTab={initialTab} />
    </div>
  );
}
