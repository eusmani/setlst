import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Sends you to your own crates, or to sign-in if you aren't signed in.
//
// The mobile home's "Crates" tile links here. Before this page existed, /crate
// matched no route at all — only /crate/[id] — so the tile hard-404'd on every
// tap. It was the single most-hit 404 in production, and it only showed up in
// the app because QuickTiles is mobile-only.
//
// Resolving the destination here rather than interpolating a username into the
// tile's href keeps it right after a rename, the same reason /profile resolves
// server-side.
export default async function CrateIndex() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  redirect(user?.username ? `/profile/${user.username}/crates` : "/login");
}
