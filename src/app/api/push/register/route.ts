import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Receives the device push token from the native shell.
//
// The shell can't post this itself: this route authenticates with the session
// cookie, and that cookie lives in the WKWebView's cookie store — a URLSession
// request from Swift arrives signed out. So the shell hands the token to the web
// layer (a `setlst:pushToken` event) and the web layer posts it here with the
// session it already has.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, platform } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Keyed by the token, not the user: a device that changes hands moves to the
  // current account instead of leaving a stale row that would deliver someone
  // else's notifications to this phone.
  await prisma.deviceToken.upsert({
    where: { token },
    create: {
      token,
      userId: session.user.id,
      platform: typeof platform === "string" ? platform : "ios",
    },
    update: { userId: session.user.id, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
