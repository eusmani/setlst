"use client";
// Triggers the native Apple In-App Purchase via the RevenueCat Capacitor plugin.
// The plugin registers as Capacitor.Plugins.Purchases once installed + synced —
// so we call it through the global bridge and degrade gracefully in web/dev.
//
// To go live: `npm i @revenuecat/purchases-capacitor`, `npx cap sync ios`, set
// NEXT_PUBLIC_REVENUECAT_IOS_KEY, and create the subscription in App Store Connect.

interface PurchasesPlugin {
  configure(o: { apiKey: string; appUserID?: string }): Promise<void>;
  getOfferings(): Promise<{ current?: { availablePackages?: unknown[] } }>;
  purchasePackage(o: { aPackage: unknown }): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
}

function plugin(): PurchasesPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: { Purchases?: PurchasesPlugin } } }).Capacitor;
  return cap?.Plugins?.Purchases ?? null;
}

export function purchasesAvailable(): boolean {
  return !!plugin() && !!process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
}

export async function purchasePlus(appUserId: string): Promise<{ ok: boolean; message: string }> {
  const P = plugin();
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
  if (!P || !apiKey) {
    return { ok: false, message: "In-app purchases aren’t enabled in this build yet — coming soon." };
  }
  try {
    await P.configure({ apiKey, appUserID: appUserId });
    const offerings = await P.getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) return { ok: false, message: "No subscription is available right now." };
    await P.purchasePackage({ aPackage: pkg });
    // RevenueCat's webhook flips the account to Plus server-side shortly after.
    return { ok: true, message: "You’re now SETLST Pro! 🎉" };
  } catch {
    return { ok: false, message: "Purchase cancelled or failed." };
  }
}

export async function restorePurchases(appUserId: string): Promise<boolean> {
  const P = plugin();
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
  if (!P || !apiKey) return false;
  try {
    await P.configure({ apiKey, appUserID: appUserId });
    await P.restorePurchases();
    return true;
  } catch {
    return false;
  }
}
