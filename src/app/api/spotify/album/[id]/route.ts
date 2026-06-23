import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/spotify";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const album = await getAlbum(id);
    if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(album);
  } catch {
    return NextResponse.json({ error: "Spotify not configured" }, { status: 503 });
  }
}
