import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Sends you to your own profile, or to sign-in if you aren't signed in.
//
// The Profile tab used to build its own href from a client-side /api/me fetch,
// which meant that until that request resolved the tab pointed at /login — so
// tapping it early in a launch showed the sign-in screen to someone already
// signed in, and if the request ever failed it pointed there for good.
//
// Deciding on the server removes the race: the tab links here unconditionally
// and the answer is known before anything renders.
export default async function ProfileIndex() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Read the username fresh rather than trusting the token, which goes stale
  // after a rename.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  redirect(user?.username ? `/profile/${user.username}` : "/login");
}
