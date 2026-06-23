import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function POST(req: NextRequest) {
  const limited = checkLimit("reset", clientIp(req), 10, 15 * 60 * 1000);
  if (limited) return limited;

  const { token, password } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string" || !password || typeof password !== "string")
    return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
