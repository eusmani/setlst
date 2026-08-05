import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The current user's live username + avatar, for the top-bar pfp and profile link.
// Kept out of the session callback so auth() stays fast and reliable.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);
  try {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      // suspendedAt drives the banner telling a suspended member why posting
      // is failing, and how to appeal (App Store guideline 1.2).
      select: { username: true, avatar: true, suspendedAt: true, suspendedReason: true },
    });
    if (!u) return NextResponse.json(null);
    return NextResponse.json({
      username: u.username,
      avatar: u.avatar,
      suspended: !!u.suspendedAt,
      suspendedReason: u.suspendedReason,
    });
  } catch {
    return NextResponse.json(null);
  }
}
