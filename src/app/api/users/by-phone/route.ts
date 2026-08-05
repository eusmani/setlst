import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockedIds } from "@/lib/moderation";
import { checkLimit, clientIp } from "@/lib/rateLimit";

// Find-your-friends contact matching (App Store guideline 5.1.2).
//
// The client hashes each number from the address book with SHA-256 and sends
// only the digests — raw phone numbers from someone's contacts never reach this
// server, are never logged, and are never written to disk. We compare against
// the `phoneHash` of members who chose to add their own number, return those
// matches, and keep nothing: no record of the submitted digests, and nothing at
// all about contacts who aren't SETLST members. The data is used solely to show
// which of your contacts are already here, and for nothing else.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkLimit("by-phone", clientIp(req), 20, 60 * 1000);
  if (limited) return limited;

  const { hashes } = await req.json().catch(() => ({}));
  if (!Array.isArray(hashes)) return NextResponse.json([]);

  // Only well-formed SHA-256 hex digests — this endpoint never accepts numbers.
  const digests = [
    ...new Set(
      hashes.filter((h): h is string => typeof h === "string" && /^[0-9a-f]{64}$/.test(h))
    ),
  ].slice(0, 500);
  if (digests.length === 0) return NextResponse.json([]);

  const hidden = await blockedIds(session.user.id);

  const users = await prisma.user.findMany({
    where: {
      phoneHash: { in: digests },
      NOT: { id: session.user.id },
      ...(hidden.length ? { id: { notIn: hidden } } : {}),
    },
    select: { id: true, username: true, avatar: true, bio: true },
    take: 50,
  });
  return NextResponse.json(users);
}
