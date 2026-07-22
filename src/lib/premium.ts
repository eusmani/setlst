import { prisma } from "./prisma";

// Synchronous premium check from already-loaded user flags (no DB round-trip).
// A user is active Plus if flagged and the current period hasn't lapsed.
export function isPremiumActive(u: { isPremium: boolean; premiumUntil: Date | null }): boolean {
  if (!u.isPremium) return false;
  if (u.premiumUntil && u.premiumUntil.getTime() < Date.now()) return false;
  return true;
}

// A user is SETLST Plus if flagged and the current period hasn't lapsed.
export async function isPremium(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });
  if (!u?.isPremium) return false;
  if (u.premiumUntil && u.premiumUntil.getTime() < Date.now()) return false;
  return true;
}

// Set (or clear) a user's premium state — called from the RevenueCat webhook.
export async function setPremium(
  userId: string,
  opts: { active: boolean; plan?: string | null; until?: Date | null; revenueCatId?: string | null }
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: opts.active,
      premiumPlan: opts.plan ?? null,
      premiumUntil: opts.until ?? null,
      ...(opts.revenueCatId !== undefined ? { revenueCatId: opts.revenueCatId } : {}),
    },
  });
}
