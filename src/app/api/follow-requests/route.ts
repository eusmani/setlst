import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Incoming follow requests for the signed-in (private) user.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.followRequest.findMany({
    where: { targetId: session.user.id },
    include: { requester: { select: { id: true, username: true, avatar: true, bio: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests: requests.map((r) => r.requester) });
}

// Accept or reject a follow request. Body: { requesterUsername, action: "accept" | "reject" }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requesterUsername, action } = await req.json();
  const requester = await prisma.user.findUnique({ where: { username: requesterUsername } });
  if (!requester) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const request = await prisma.followRequest.findUnique({
    where: { requesterId_targetId: { requesterId: requester.id, targetId: session.user.id } },
  });
  if (!request) return NextResponse.json({ error: "No such request" }, { status: 404 });

  if (action === "accept") {
    // Create the follow (if not already there), then drop the request.
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: requester.id, followingId: session.user.id } },
      create: { followerId: requester.id, followingId: session.user.id },
      update: {},
    });
  }
  await prisma.followRequest.delete({ where: { id: request.id } });

  return NextResponse.json({ ok: true, accepted: action === "accept" });
}
