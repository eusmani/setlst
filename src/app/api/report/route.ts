import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLimit } from "@/lib/rateLimit";
import {
  REPORT_REASONS,
  REPORTABLE_TYPES,
  type ReportableType,
} from "@/lib/moderation";

// Reporting offensive content (App Store guideline 1.2). Anything reported here
// shows up in the moderation queue at /studio/moderation and is worked within
// 24 hours.

const VALID_REASONS = new Set<string>(REPORT_REASONS.map((r) => r.value));
const VALID_TYPES = new Set<string>(REPORTABLE_TYPES);

/**
 * Resolve a reported item to its author and a text snapshot, so the report
 * survives the author deleting the content before it is reviewed.
 */
async function resolveTarget(
  type: ReportableType,
  id: string
): Promise<{ authorId: string | null; snapshot: string } | null> {
  switch (type) {
    case "review": {
      const r = await prisma.review.findUnique({
        where: { id },
        select: { userId: true, subject: true, body: true, album: { select: { title: true, artist: true } } },
      });
      if (!r) return null;
      return {
        authorId: r.userId,
        snapshot: [`Review of ${r.album?.artist ?? "?"} — ${r.album?.title ?? "?"}`, r.subject, r.body]
          .filter(Boolean)
          .join("\n"),
      };
    }
    case "comment": {
      const c = await prisma.comment.findUnique({
        where: { id },
        select: { userId: true, body: true, albumSpotifyId: true },
      });
      if (!c) return null;
      return { authorId: c.userId, snapshot: `Comment on album ${c.albumSpotifyId}\n${c.body}` };
    }
    case "thread": {
      const t = await prisma.thread.findUnique({
        where: { id },
        select: { userId: true, title: true, body: true },
      });
      if (!t) return null;
      return { authorId: t.userId, snapshot: `${t.title}\n${t.body}` };
    }
    case "reply": {
      const r = await prisma.threadReply.findUnique({
        where: { id },
        select: { userId: true, body: true, threadId: true },
      });
      if (!r) return null;
      return { authorId: r.userId, snapshot: `Reply in discussion ${r.threadId}\n${r.body}` };
    }
    case "message": {
      const m = await prisma.directMessage.findUnique({
        where: { id },
        select: { fromId: true, toId: true, body: true },
      });
      if (!m) return null;
      return { authorId: m.fromId, snapshot: `Direct message\n${m.body ?? "(shared album or discussion)"}` };
    }
    case "user": {
      // `id` is a username here — that's what the profile UI has on hand.
      const u = await prisma.user.findUnique({
        where: { username: id.toLowerCase() },
        select: { id: true, username: true, bio: true },
      });
      if (!u) return null;
      return { authorId: u.id, snapshot: `Profile @${u.username}\n${u.bio ?? ""}` };
    }
  }
}

/** POST /api/report { contentType, contentId, reason, details? } */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reports are cheap to file and easy to weaponize — cap them.
  const limited = checkLimit("report", session.user.id, 15, 60 * 60 * 1000);
  if (limited) return limited;

  const { contentType, contentId, reason, details } = await req.json().catch(() => ({}));

  if (!VALID_TYPES.has(String(contentType))) {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }
  if (!VALID_REASONS.has(String(reason))) {
    return NextResponse.json({ error: "Pick a reason" }, { status: 400 });
  }
  if (!contentId) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  const type = contentType as ReportableType;
  const target = await resolveTarget(type, String(contentId));
  if (!target) return NextResponse.json({ error: "That content no longer exists" }, { status: 404 });

  if (target.authorId === session.user.id) {
    return NextResponse.json({ error: "You can't report your own content" }, { status: 400 });
  }

  // One open report per person per item — re-reporting shouldn't spam the queue.
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      contentType: type,
      contentId: String(contentId),
      status: "pending",
    },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyReported: true });

  await prisma.report.create({
    data: {
      contentType: type,
      contentId: String(contentId),
      reason: String(reason),
      details: details ? String(details).slice(0, 1000) : null,
      snapshot: target.snapshot.slice(0, 2000),
      reporterId: session.user.id,
      reportedUserId: target.authorId,
    },
  });

  return NextResponse.json({ ok: true });
}
