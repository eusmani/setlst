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
      select: { username: true, avatar: true },
    });
    return NextResponse.json(u ?? null);
  } catch {
    return NextResponse.json(null);
  }
}
