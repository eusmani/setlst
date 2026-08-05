import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/rateLimit";

// Blocking (App Store guideline 1.2). Blocks live in the database rather than
// localStorage so they are enforced server-side on every request, apply to DMs
// and follows — not just list rendering — and survive a reinstall.

const userSel = { id: true, username: true, avatar: true, bio: true } as const;

/** GET /api/block → the people you have blocked. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ blocked: [] }, { status: 401 });

  const rows = await prisma.block.findMany({
    where: { blockerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: userSel } },
  });

  return NextResponse.json({
    blocked: rows.map((r) => ({ ...r.blocked, blockedAt: r.createdAt.toISOString() })),
  });
}

/** POST /api/block { username } → block someone (also unfollows both ways). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkLimit("block", session.user.id, 30, 60 * 1000);
  if (limited) return limited;

  const { username } = await req.json().catch(() => ({}));
  const name = String(username ?? "").trim().toLowerCase();
  if (!name) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username: name }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });
  }

  const me = session.user.id;

  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: target.id } },
      create: { blockerId: me, blockedId: target.id },
      update: {},
    }),
    // A block severs the relationship in both directions.
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: me, followingId: target.id },
          { followerId: target.id, followingId: me },
        ],
      },
    }),
    prisma.followRequest.deleteMany({
      where: {
        OR: [
          { requesterId: me, targetId: target.id },
          { requesterId: target.id, targetId: me },
        ],
      },
    }),
  ]);

  return NextResponse.json({ blocked: true });
}

/** DELETE /api/block?username=… → unblock. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = (req.nextUrl.searchParams.get("username") ?? "").trim().toLowerCase();
  if (!name) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username: name }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.block.deleteMany({ where: { blockerId: session.user.id, blockedId: target.id } });
  return NextResponse.json({ blocked: false });
}
