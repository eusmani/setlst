import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";

// Live username availability check for the sign-up flow. Usernames are stored
// lowercase, so we normalize before looking up — keeping this consistent with
// register + profile update so "taken" here matches what those endpoints enforce.
export async function GET(req: NextRequest) {
  // Modest throttle to deter enumeration/scraping.
  const limited = checkLimit("username-check", clientIp(req), 60, 60 * 1000);
  if (limited) return limited;

  const raw = req.nextUrl.searchParams.get("u") ?? "";
  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
