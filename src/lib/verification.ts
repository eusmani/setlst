import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, verifyEmailHtml } from "@/lib/email";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Create a fresh verification token for a user and email them the verify link.
export async function sendVerificationEmail(opts: {
  userId: string;
  username: string;
  email: string;
  appUrl: string;
}): Promise<void> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.deleteMany({ where: { userId: opts.userId } });
  await prisma.emailVerificationToken.create({
    data: { userId: opts.userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const link = `${opts.appUrl}/verify-email?token=${raw}`;
  await sendEmail(opts.email, "Verify your SETLST email", verifyEmailHtml(opts.username, link));
}

export const hashToken = sha256;
