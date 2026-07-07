import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isConnected, disconnect } from "@/lib/spotifyUser";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: await isConnected(session.user.id) });
}

// POST → disconnect Spotify.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await disconnect(session.user.id);
  return NextResponse.json({ connected: false });
}
