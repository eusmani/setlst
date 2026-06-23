import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All User relations (reviews, likes, comments, follows, saved albums…) cascade on delete.
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
