import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/verification";
import { checkLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = checkLimit("verify-email", clientIp(req), 20, 15 * 60 * 1000);
  if (limited) return limited;

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string")
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => {});
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
