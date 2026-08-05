import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The moderation queue's backing API (App Store guideline 1.2). Only accounts
// flagged `isModerator` can read reports or act on them.

async function requireModerator() {
  const session = await auth();
  if (!session) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isModerator: true },
  });
  return me?.isModerator ? me : null;
}

/** GET /api/moderation?status=pending → the queue, oldest first. */
export async function GET(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const reports = await prisma.report.findMany({
    where: status === "all" ? {} : { status },
    // Oldest first: the queue is worked in the order things came in, which is
    // what keeps everything inside the 24-hour window.
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      reporter: { select: { username: true } },
      reportedUser: { select: { id: true, username: true, suspendedAt: true } },
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      contentType: r.contentType,
      contentId: r.contentId,
      reason: r.reason,
      details: r.details,
      snapshot: r.snapshot,
      status: r.status,
      // Null once the reporter deletes their account — the report still stands.
      reporter: r.reporter?.username ?? null,
      reportedUser: r.reportedUser
        ? { username: r.reportedUser.username, suspended: !!r.reportedUser.suspendedAt }
        : null,
    })),
  });
}

/**
 * POST /api/moderation { reportId, action, note? }
 *
 * action:
 *   "remove"   — hide the content and close the report
 *   "suspend"  — remove the content and suspend its author
 *   "dismiss"  — no violation
 */
export async function POST(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId, action, note } = await req.json().catch(() => ({}));
  if (!reportId || !["remove", "suspend", "dismiss"].includes(String(action))) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: String(reportId) } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "remove" || action === "suspend") {
    await removeContent(report.contentType, report.contentId);
  }

  if (action === "suspend" && report.reportedUserId) {
    await prisma.user.update({
      where: { id: report.reportedUserId },
      data: {
        suspendedAt: new Date(),
        suspendedReason:
          "Your account is suspended for violating our Terms of Use. Email support@setlst.dev to appeal.",
      },
    });
    // Everything else they've posted goes too.
    await removeAllContentBy(report.reportedUserId);
  }

  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: action === "dismiss" ? "dismissed" : action === "suspend" ? "user_suspended" : "removed",
      resolvedAt: new Date(),
      resolvedById: mod.id,
      resolverNote: note ? String(note).slice(0, 500) : null,
    },
  });

  // Close any other open reports pointing at the same item.
  if (action !== "dismiss") {
    await prisma.report.updateMany({
      where: {
        contentType: report.contentType,
        contentId: report.contentId,
        status: "pending",
        NOT: { id: report.id },
      },
      data: { status: "removed", resolvedAt: new Date(), resolvedById: mod.id },
    });
  }

  return NextResponse.json({ ok: true });
}

/** Soft-delete a single piece of content — hidden everywhere, kept as evidence. */
async function removeContent(type: string, id: string): Promise<void> {
  const removedAt = new Date();
  switch (type) {
    case "review":
      await prisma.review.updateMany({ where: { id }, data: { removedAt } });
      break;
    case "comment":
      await prisma.comment.updateMany({ where: { id }, data: { removedAt } });
      break;
    case "thread":
      await prisma.thread.updateMany({ where: { id }, data: { removedAt } });
      break;
    case "reply":
      await prisma.threadReply.updateMany({ where: { id }, data: { removedAt } });
      break;
    case "message":
      await prisma.directMessage.updateMany({ where: { id }, data: { removedAt } });
      break;
    case "user":
      // Reporting a profile targets the account, handled by the suspend action.
      break;
  }
}

/** Hide everything a suspended account has posted. */
async function removeAllContentBy(userId: string): Promise<void> {
  const removedAt = new Date();
  const where = { userId, removedAt: null };
  await prisma.$transaction([
    prisma.review.updateMany({ where, data: { removedAt } }),
    prisma.comment.updateMany({ where, data: { removedAt } }),
    prisma.thread.updateMany({ where, data: { removedAt } }),
    prisma.threadReply.updateMany({ where, data: { removedAt } }),
    prisma.directMessage.updateMany({ where: { fromId: userId, removedAt: null }, data: { removedAt } }),
  ]);
}
