import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPremium } from "@/lib/premium";

// GET → the current user's SETLST Plus status (+ RevenueCat app_user_id to pass
// to the native purchase SDK so entitlements link back to this account).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ premium: false });
  const [premium, u] = await Promise.all([
    isPremium(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { premiumPlan: true, premiumUntil: true } }),
  ]);
  return NextResponse.json({
    premium,
    plan: u?.premiumPlan ?? null,
    until: u?.premiumUntil?.toISOString() ?? null,
    appUserId: session.user.id, // RevenueCat app_user_id = SETLST user id
  });
}
