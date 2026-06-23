import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ verified: true }); // not logged in → no banner
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, email: true },
  });
  return NextResponse.json({ verified: !!user?.emailVerified, email: user?.email ?? null });
}
