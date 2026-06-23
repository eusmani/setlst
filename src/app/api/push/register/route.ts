import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Receives the device push token from the native shell. Full delivery still
// requires an APNs key + a sender; for now we accept and acknowledge the token.
// (Wire this to a DeviceToken table + APNs sender when push delivery is built.)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, platform } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  // TODO: persist { userId: session.user.id, token, platform } and send via APNs.
  console.log(`push token registered for ${session.user.id} (${platform})`);
  return NextResponse.json({ ok: true });
}
