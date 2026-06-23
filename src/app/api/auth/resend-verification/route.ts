import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/verification";
import { checkLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Avoid spamming: a few resends per 15 min per user.
  const limited = checkLimit("resend-verify", session.user.id, 4, 15 * 60 * 1000);
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, email: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  await sendVerificationEmail({ userId: session.user.id, username: user.username, email: user.email, appUrl });
  return NextResponse.json({ ok: true });
}
