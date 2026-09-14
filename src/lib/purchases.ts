"use client";
// Apple In-App Purchase for SETLST Pro, via RevenueCat.
//
// ARCHITECTURE NOTE: SETLST's iOS app is a Capacitor WKWebView shell that loads
// https://setlst.dev — the main app target has no SwiftUI (its entry point is a
// UIKit AppDelegate). So all of this lives here in TypeScript and reaches
// StoreKit through @revenuecat/purchases-capacitor, whose native side already
// vendors the RevenueCat iOS SDK (via purchases-hybrid-common). Do NOT also add
// purchases-ios-spm to the Xcode project — that links a second copy of the same
// SDK into the binary.
//
// Entitlement is NOT granted client-side. RevenueCat's webhook calls
// /api/revenuecat/webhook, which flips the account server-side; we pass the
// SETLST user id as appUserID so those events map back to the account. Treat
// the entitlement read here as UI state only — /api/premium/status is the
// source of truth.
import { Purchases, type CustomerInfo } from "@revenuecat/purchases-capacitor";
import { RevenueCatUI, PAYWALL_RESULT } from "@revenuecat/purchases-capacitor-ui";

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = "setlst_pro";

const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;

// Capacitor injects its bridge into the WKWebView even though we load the
// remote site, so this is how we tell "inside the app" from "web".
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function purchasesAvailable(): boolean {
  return isNative() && !!apiKey;
}

// configure() is only worth calling once per user per session; calling it on
// every tap re-initialises the SDK and throws away the offerings cache.
let configuredFor: string | null = null;
async function ensureConfigured(appUserId: string): Promise<void> {
  if (configuredFor === appUserId) return;
  await Purchases.configure({ apiKey: apiKey!, appUserID: appUserId });
  configuredFor = appUserId;
}

/** True when the cached CustomerInfo shows an active setlst_pro entitlement. */
export function hasPro(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}

/** Current RevenueCat CustomerInfo, or null off-device / unconfigured. */
export async function getCustomerInfo(appUserId: string): Promise<CustomerInfo | null> {
  if (!purchasesAvailable()) return null;
  try {
    await ensureConfigured(appUserId);
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch {
    return null;
  }
}

/** Expiry of the active Pro entitlement, when there is one. */
export async function proExpiresAt(appUserId: string): Promise<Date | null> {
  const info = await getCustomerInfo(appUserId);
  const ent = info?.entitlements.active[PRO_ENTITLEMENT];
  return ent?.expirationDate ? new Date(ent.expirationDate) : null;
}

/**
 * Presents the RevenueCat paywall (designed in the dashboard, so pricing and
 * copy change without an App Store release). Replaces hand-rolled package
 * selection, which is no longer the recommended approach.
 */
export async function purchasePlus(appUserId: string): Promise<{ ok: boolean; message: string }> {
  if (!purchasesAvailable()) {
    return { ok: false, message: "In-app purchases aren’t enabled in this build yet — coming soon." };
  }
  try {
    await ensureConfigured(appUserId);
    const { result } = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        // The webhook flips the account to Pro server-side shortly after.
        return { ok: true, message: "You’re now SETLST Pro! 🎉" };
      case PAYWALL_RESULT.RESTORED:
        return { ok: true, message: "Purchases restored." };
      case PAYWALL_RESULT.CANCELLED:
        return { ok: false, message: "Purchase cancelled." };
      case PAYWALL_RESULT.NOT_PRESENTED:
        return { ok: false, message: "No subscription is available right now." };
      default:
        return { ok: false, message: "Purchase failed. Please try again." };
    }
  } catch {
    return { ok: false, message: "Purchase failed. Please try again." };
  }
}

/** Shows the paywall only to users who don't already have Pro. */
export async function showPaywallIfNeeded(appUserId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  try {
    await ensureConfigured(appUserId);
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
    });
    return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
  } catch {
    return false;
  }
}

/**
 * RevenueCat's Customer Center — cancellations, refund requests, plan changes
 * and restores, handled by RevenueCat rather than by us. Only worth showing to
 * someone who actually has a subscription.
 */
export async function openCustomerCenter(appUserId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  try {
    await ensureConfigured(appUserId);
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch {
    return false;
  }
}

export async function restorePurchases(appUserId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  try {
    await ensureConfigured(appUserId);
    const { customerInfo } = await Purchases.restorePurchases();
    return hasPro(customerInfo);
  } catch {
    return false;
  }
}
