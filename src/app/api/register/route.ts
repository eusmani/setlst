import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resolveMx } from "dns/promises";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { sendVerificationEmail } from "@/lib/verification";

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

  const { username, email, password, phone, name } = await req.json();
  if (!username || !email || !password || !phone)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  // Optional display name — stored in the profile bio for now (no dedicated
  // column). Kept short and sanitized.
  const cleanName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  const cleanUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername))
    return NextResponse.json({ error: "Username: 3–20 chars, lowercase letters/numbers/underscores" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone)
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
