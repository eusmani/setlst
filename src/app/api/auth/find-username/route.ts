import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rateLimit";
import { sendEmail, usernameReminderHtml } from "@/lib/email";

// "Find my username": given an email, email the account's username to that
// address. Always responds the same way so we never reveal whether an email is
// registered. The username is NEVER returned to the client.
export async function POST(req: NextRequest) {
  const limited = checkLimit("find-username", clientIp(req), 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { email } = await req.json().catch(() => ({}));
  const generic = NextResponse.json({ ok: true });
  if (!email || typeof email !== "string") return generic;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return generic;

  await sendEmail(user.email, "Your SETLST username", usernameReminderHtml(user.username));
  return generic;
}
