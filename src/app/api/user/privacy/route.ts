import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isPrivate: true } });
  return NextResponse.json({ isPrivate: !!user?.isPrivate });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isPrivate } = await req.json();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { isPrivate: !!isPrivate },
  });
  return NextResponse.json({ isPrivate: !!isPrivate });
}
