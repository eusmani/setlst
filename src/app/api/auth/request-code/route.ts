import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { sendEmail, signInCodeHtml } from "@/lib/email";
import { sendSms, signInCodeSms } from "@/lib/sms";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Request a one-time sign-in code. Accepts an email OR a phone number. Always
// responds the same way (generic) so we never reveal whether an account exists.
// The code is delivered out-of-band (email or SMS) and never returned here.
export async function POST(req: NextRequest) {
  const limited = checkLimit("request-code", clientIp(req), 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { identifier } = await req.json().catch(() => ({}));
  // `channel` lets the UI tell the user where to look without revealing existence.
  const isEmail = typeof identifier === "string" && identifier.includes("@");
  const generic = NextResponse.json({ ok: true, channel: isEmail ? "email" : "sms" });
  if (!identifier || typeof identifier !== "string") return generic;

  const id = identifier.trim();
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
    : await (async () => {
        const phone = normalizePhone(id);
        return phone ? prisma.user.findFirst({ where: { phone } }) : null;
      })();
  if (!user) return generic;

  // 6-digit code; store only the hash, invalidate any prior codes for this user.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.signInCode.deleteMany({ where: { userId: user.id } });
  await prisma.signInCode.create({
    data: { userId: user.id, codeHash: sha256(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  if (isEmail) {
    await sendEmail(user.email, "Your SETLST sign-in code", signInCodeHtml(user.username, code));
  } else {
    // Send via SMS to the number the user typed; fall back to email if SMS
    // delivery isn't configured/available so the code still reaches them.
    const delivered = await sendSms(id, signInCodeSms(code));
    if (!delivered) {
      await sendEmail(user.email, "Your SETLST sign-in code", signInCodeHtml(user.username, code));
    }
  }

  return generic;
}
