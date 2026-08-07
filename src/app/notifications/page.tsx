import Link from "next/link";
import { auth } from "@/lib/auth";
import NotificationsList from "@/components/activity/NotificationsList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications — SETLST",
  description: "Replies, likes, follows and requests aimed at you.",
};

// The notifications inbox, reached from the home screen's Notifications tile.
//
// Separate from /activity, which is what everyone else has been doing — this is
// only things involving you.
export default async function NotificationsPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-serif text-2xl text-[#f0f0f0]">Notifications</h1>
        <Link href="/activity" className="text-xs text-[#c4a832] hover:underline">
          All activity →
        </Link>
      </div>

      <NotificationsList isLoggedIn={!!session} />
    </div>
  );
}
