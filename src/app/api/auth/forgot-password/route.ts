import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";
import { sendEmail, passwordResetHtml } from "@/lib/email";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

function baseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    req.headers.get("origin") ||
    `https://${req.headers.get("host")}`
  );
}

export async function POST(req: NextRequest) {
  // Rate limit by IP to stop reset-email spam / user enumeration probing.
  const limited = checkLimit("forgot", clientIp(req), 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { email } = await req.json().catch(() => ({}));
  // Always respond the same way so we never reveal whether an email is registered.
  const generic = NextResponse.json({ ok: true });
  if (!email || typeof email !== "string") return generic;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return generic;

  // Invalidate prior tokens, issue a fresh one (raw token emailed, only the hash stored).
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const link = `${baseUrl(req)}/reset-password?token=${raw}`;
  await sendEmail(user.email, "Reset your SETLST password", passwordResetHtml(user.username, link));

  return generic;
}
