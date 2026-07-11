import { NextRequest, NextResponse } from "next/server";
import { setPremium } from "@/lib/premium";
import { prisma } from "@/lib/prisma";

// Apple App Store Server Notifications V2 endpoint.
// Paste this URL into App Store Connect → your app → App Information →
// "App Store Server Notifications" (both Production and Sandbox):
//   https://setlst.dev/api/apple/notifications
//
// Apple POSTs { signedPayload } — a signed JWS. We decode it, read the
// notification type + the transaction/renewal info, and flip the user's premium
// state. The user is matched via `appAccountToken`, which the purchase flow sets
// to the SETLST user id (StoreKit appAccountToken / RevenueCat app_user_id).
//
// Note: this decodes the JWS payload; for hardened production you should also
// verify the x5c certificate chain against Apple's root CA before trusting it.

export const dynamic = "force-dynamic";

const BUNDLE_ID = "app.setlst.mobile";

function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T | null {
  try {
    const seg = jws.split(".")[1];
    if (!seg) return null;
    const json = Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// notificationType (+ subtype) → whether the subscription is active afterwards.
const ACTIVE = new Set(["SUBSCRIBED", "DID_RENEW", "DID_RECOVER", "OFFER_REDEEMED"]);
const ENDED = new Set(["EXPIRED", "REVOKE", "REFUND", "GRACE_PERIOD_EXPIRED"]);

export async function POST(req: NextRequest) {
  let body: { signedPayload?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }
  if (!body?.signedPayload) return NextResponse.json({ ok: true });

  const payload = decodeJwsPayload<{
    notificationType?: string;
    subtype?: string;
    data?: { bundleId?: string; signedTransactionInfo?: string; signedRenewalInfo?: string };
  }>(body.signedPayload);
  if (!payload) return NextResponse.json({ ok: true });

  // Basic sanity check — ignore notifications for other apps.
  if (payload.data?.bundleId && payload.data.bundleId !== BUNDLE_ID) {
    return NextResponse.json({ ok: true });
  }

  const type = payload.notificationType ?? "";
  const subtype = payload.subtype ?? "";

  const tx = payload.data?.signedTransactionInfo
    ? decodeJwsPayload<{ appAccountToken?: string; originalTransactionId?: string; productId?: string; expiresDate?: number }>(payload.data.signedTransactionInfo)
    : null;
  const renewal = payload.data?.signedRenewalInfo
    ? decodeJwsPayload<{ autoRenewStatus?: number; productId?: string }>(payload.data.signedRenewalInfo)
    : null;

  // Map the transaction to a SETLST account.
  const appAccountToken = tx?.appAccountToken ?? "";
  const originalTransactionId = tx?.originalTransactionId ?? "";
  const plan = tx?.productId ?? renewal?.productId ?? null;
  const until = typeof tx?.expiresDate === "number" ? new Date(tx.expiresDate) : null;

  // Prefer appAccountToken (= our user id). Fall back to a stored transaction id.
  let userId = appAccountToken;
  try {
    if (!userId && originalTransactionId) {
      const u = await prisma.user.findFirst({ where: { revenueCatId: originalTransactionId }, select: { id: true } });
      userId = u?.id ?? "";
    }
  } catch { /* ignore */ }
  if (!userId) return NextResponse.json({ ok: true });

  // A billing-issue that entered the grace period keeps access for now.
  const gracePeriod = type === "DID_FAIL_TO_RENEW" && subtype === "GRACE_PERIOD";

  try {
    if (ACTIVE.has(type) || gracePeriod) {
      await setPremium(userId, { active: true, plan, until, revenueCatId: originalTransactionId || undefined });
    } else if (ENDED.has(type)) {
      await setPremium(userId, { active: false, plan: null, until: null });
    }
    // Other types (DID_CHANGE_RENEWAL_STATUS, PRICE_INCREASE, TEST, etc.) need no entitlement change.
  } catch {
    // Account may not exist locally — ack anyway so Apple doesn't retry forever.
  }
  return NextResponse.json({ ok: true });
}

// Apple only POSTs here; a GET is handy for a quick reachability check.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "apple-app-store-server-notifications-v2" });
}
