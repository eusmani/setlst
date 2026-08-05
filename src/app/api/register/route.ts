import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resolveMx } from "dns/promises";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";
import { normalizePhone, hashPhone } from "@/lib/phone";
import { sendVerificationEmail } from "@/lib/verification";
import { screenText, TERMS_VERSION } from "@/lib/moderation";

// Confirm the email's domain can actually receive mail (has MX records).
async function emailDomainIsReal(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const mx = await resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Throttle signups: 5 per hour per IP to deter bot account creation.
  const limited = checkLimit("register", clientIp(req), 5, 60 * 60 * 1000);
  if (limited) return limited;

  const { username, email, password, phone, name, acceptedTerms } = await req.json();
  if (!username || !email || !password)
    return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 });

  // Guideline 1.2: every account must accept the EULA + privacy policy, and the
  // acceptance is recorded against the version they agreed to.
  if (acceptedTerms !== true) {
    return NextResponse.json(
      { error: "You must accept the Terms of Use and Privacy Policy to create an account." },
      { status: 400 }
    );
  }

  // Optional display name — stored in the profile bio for now (no dedicated
  // column). Kept short and sanitized.
  const cleanName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  const cleanUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername))
    return NextResponse.json({ error: "Username: 3–20 chars, lowercase letters/numbers/underscores" }, { status: 400 });
  if (!screenText(cleanUsername).ok || !screenText(cleanName).ok)
    return NextResponse.json({ error: "That username or name isn't allowed." }, { status: 422 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  // Guideline 5.1.1(v): a phone number isn't required to use SETLST — it's
  // optional, and only powers account recovery and find-your-friends matching.
  // Supplying one that's malformed is still an error.
  const hasPhone = phone !== undefined && phone !== null && String(phone).trim() !== "";
  const normalizedPhone = hasPhone ? normalizePhone(phone) : null;
  if (hasPhone && !normalizedPhone)
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (!(await emailDomainIsReal(cleanEmail)))
    return NextResponse.json({ error: "That email address doesn't look real — check for typos." }, { status: 400 });

  const exists = await prisma.user.findFirst({ where: { OR: [{ email: cleanEmail }, { username: cleanUsername }] } });
  if (exists) return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hash,
        phone: normalizedPhone,
        phoneHash: normalizedPhone ? await hashPhone(normalizedPhone) : null,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        ...(cleanName ? { bio: cleanName } : {}),
      },
    });
  } catch (e) {
    // Unique-constraint race: two concurrent signups passed the check above and
    // one lost at the DB. The @unique constraint guarantees no duplicate is
    // stored — surface a clean 409 instead of a 500.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });
    }
    throw e;
  }

  // Send the verification email — non-blocking: registration still succeeds if email fails.
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    await sendVerificationEmail({ userId: user.id, username: cleanUsername, email: cleanEmail, appUrl });
  } catch { /* ignore email errors */ }

  return NextResponse.json({ id: user.id, username: user.username });
}
