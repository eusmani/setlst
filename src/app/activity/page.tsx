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
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0f0f0]">
          Activity
        </h1>
        <p className="text-sm text-[#6b6b6b] mt-1">
          What you and your friends are spinning, plus what&apos;s hot right now.
        </p>
      </div>

      <ActivityTabs friendsActivity={friendsActivity} myActivity={myActivity} isLoggedIn={!!session} initialTab={initialTab} />
    </div>
  );
}
