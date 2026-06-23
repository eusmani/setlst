import { NextRequest, NextResponse } from "next/server";
import { getAlbumDescription } from "@/lib/wikipedia";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const artist = req.nextUrl.searchParams.get("artist");
  if (!title || !artist) return NextResponse.json({ description: null });
  try {
    const description = await getAlbumDescription(title, artist);
    return NextResponse.json({ description: description ?? null });
  } catch {
    return NextResponse.json({ description: null });
  }
}
