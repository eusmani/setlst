import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authorizeUrl } from "@/lib/spotifyUser";

// GET /api/spotify/connect → send the logged-in user to Spotify's authorize page.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://setlst.dev"));
  // State carries the user id (the session cookie may not survive the round-trip
  // in the in-app browser), signed lightly by including it; the callback re-checks
  // the session too.
  return NextResponse.redirect(authorizeUrl(session.user.id));
}
