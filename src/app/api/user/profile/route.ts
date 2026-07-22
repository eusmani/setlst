import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bio, avatar, username, phone, email } = await req.json();

  if (bio != null && typeof bio !== "string") {
    return NextResponse.json({ error: "Invalid bio" }, { status: 400 });
  }
  if (bio && bio.length > 300) {
    return NextResponse.json({ error: "Bio must be 300 characters or fewer" }, { status: 400 });
  }
  // avatar is a data URL or image URL; cap size to keep the row small
  if (avatar != null && typeof avatar !== "string") {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }
  if (avatar && avatar.length > 400_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  // Optional username change. Usernames are stored lowercase (same as register)
  // so uniqueness is consistent — otherwise "bob" and "Bob" would be treated as
  // distinct by SQLite's case-sensitive unique index, allowing case-variant dupes.
  let nextUsername: string | undefined;
  if (username != null) {
    const cleanUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json({ error: "Username: 3–20 chars, lowercase letters/numbers/underscores" }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
    if (cleanUsername !== current?.username) {
      const taken = await prisma.user.findFirst({ where: { username: cleanUsername, NOT: { id: session.user.id } }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
      nextUsername = cleanUsername;
    }
  }

  // Optional email change
  let nextEmail: string | undefined;
  if (email != null && email !== "") {
    const e = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
    if (e !== current?.email) {
      const taken = await prisma.user.findFirst({ where: { email: e, NOT: { id: session.user.id } }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      nextEmail = e;
    }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bio: bio?.trim() || null,
        ...(avatar !== undefined ? { avatar: avatar || null } : {}),
        ...(nextUsername ? { username: nextUsername } : {}),
        ...(phone !== undefined ? { phone: phone ? normalizePhone(phone) : null } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
      },
    });
  } catch (e) {
    // Unique-constraint race on username/email — surface a clean 409.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That username or email is already taken" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, username: nextUsername });
}
