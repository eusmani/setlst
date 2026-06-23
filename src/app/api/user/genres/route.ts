import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { genres } = await req.json();
  if (!Array.isArray(genres) || genres.length > 5) {
    return NextResponse.json({ error: "Provide up to 5 genres" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteGenres: genres.join(",") },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteGenres: true },
  });

  return NextResponse.json({
    genres: user?.favoriteGenres ? user.favoriteGenres.split(",") : [],
  });
}
