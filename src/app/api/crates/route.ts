import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const albumSelect = { id: true, spotifyId: true, title: true, artist: true, artwork: true, year: true } as const;

// GET /api/crates?username=…  → that user's crates (with albums).
// GET /api/crates             → the signed-in user's crates.
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  let userId: string | undefined;
  if (username) {
    const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) return NextResponse.json([]);
    userId = u.id;
  } else {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });
    userId = session.user.id;
  }

  const crates = await prisma.crate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { albums: { select: albumSelect, orderBy: { addedAt: "desc" } } },
  });
  return NextResponse.json(crates);
}

// POST /api/crates  { name }  → create a crate.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  const clean = String(name ?? "").trim();
  if (!clean) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (clean.length > 60) return NextResponse.json({ error: "Name too long" }, { status: 400 });

  const crate = await prisma.crate.create({
    data: { name: clean, userId: session.user.id },
    include: { albums: { select: albumSelect } },
  });
  return NextResponse.json(crate);
}

// PATCH /api/crates  { id, name }  → rename a crate.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name } = await req.json();
  const clean = String(name ?? "").trim();
  if (!id || !clean) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const crate = await prisma.crate.findUnique({ where: { id }, select: { userId: true } });
  if (!crate || crate.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.crate.update({ where: { id }, data: { name: clean.slice(0, 60) } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/crates?id=…  → delete a crate.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const crate = await prisma.crate.findUnique({ where: { id }, select: { userId: true } });
  if (!crate || crate.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.crate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
