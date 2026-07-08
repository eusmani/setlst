import { NextRequest, NextResponse } from "next/server";
import { setPremium } from "@/lib/premium";

// RevenueCat server webhook. Configure in RevenueCat → Project → Integrations →
// Webhooks, pointing at https://setlst.dev/api/revenuecat/webhook, and set an
// Authorization header value matching REVENUECAT_WEBHOOK_SECRET.
//
// We use the SETLST user id as RevenueCat's app_user_id, so events map straight
// back to the account. Docs: https://www.revenuecat.com/docs/webhooks
export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: { event?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }
  const e = body?.event;
  if (!e) return NextResponse.json({ ok: true });

  const type = String(e.type ?? "");
  const userId = String(e.app_user_id ?? "");
  const plan = e.product_id ? String(e.product_id) : null;
  const expiresMs = typeof e.expiration_at_ms === "number" ? e.expiration_at_ms : null;
  if (!userId) return NextResponse.json({ ok: true });

  // Active-granting vs. ending events.
  const grants = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE"];
  const ends = ["EXPIRATION", "CANCELLATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"];

  try {
    if (grants.includes(type)) {
      await setPremium(userId, { active: true, plan, until: expiresMs ? new Date(expiresMs) : null });
    } else if (ends.includes(type)) {
      // Keep access until the paid period actually ends (expiration event).
      if (type === "EXPIRATION") await setPremium(userId, { active: false, plan: null, until: null });
      else await setPremium(userId, { active: true, plan, until: expiresMs ? new Date(expiresMs) : null });
    }
  } catch {
    // User may not exist locally; ack anyway so RevenueCat doesn't retry forever.
  }
  return NextResponse.json({ ok: true });
}
