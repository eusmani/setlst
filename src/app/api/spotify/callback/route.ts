import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCode } from "@/lib/spotifyUser";

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://setlst.dev";

// GET /api/spotify/callback?code=&state= → store tokens for the user, then return.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // = userId
  const err = req.nextUrl.searchParams.get("error");
  if (err || !code) return NextResponse.redirect(new URL("/settings?spotify=error", APP));

  // Prefer the live session; fall back to the state (userId) for in-app browsers.
  const session = await auth();
  const userId = session?.user?.id ?? state ?? undefined;
  if (!userId) return NextResponse.redirect(new URL("/login", APP));

  const ok = await exchangeCode(userId, code);
  return NextResponse.redirect(new URL(`/settings?spotify=${ok ? "connected" : "error"}`, APP));
}
