import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { checkLimit, clientIp } from "@/lib/rateLimit";

// Given a list of phone numbers (e.g. from the user's contacts), return SETLST
// members whose account phone number matches. Numbers are never stored or logged.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkLimit("by-phone", clientIp(req), 20, 60 * 1000);
  if (limited) return limited;

  const { phones } = await req.json().catch(() => ({}));
  if (!Array.isArray(phones)) return NextResponse.json([]);

  const normalized = [...new Set(phones.map(normalizePhone).filter((p): p is string => !!p))].slice(0, 500);
  if (normalized.length === 0) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: { phone: { in: normalized }, NOT: { id: session.user.id } },
    select: { id: true, username: true, avatar: true, bio: true },
    take: 50,
  });
  return NextResponse.json(users);
}
