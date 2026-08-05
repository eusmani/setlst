// Content moderation + blocking — the server-side half of App Store guideline
// 1.2 (user-generated content). Every UGC write path runs text through
// `screenText`, every read path hides blocked users and removed content, and
// anything a user reports lands in the queue at /studio/moderation.
import { prisma } from "./prisma";
import { BLOCKED_TERMS, CATEGORY_LABEL, ESCALATE, type BlockedCategory } from "./wordlist";
import type { ReportableType } from "./reportTypes";

// Constants the UI also needs live in ./reportTypes (this module imports Prisma
// and must stay server-only); re-exported here so server code has one import.
export {
  REPORT_REASONS,
  REPORTABLE_TYPES,
  TERMS_VERSION,
  MODERATION_SLA_HOURS,
} from "./reportTypes";
export type { ReportReason, ReportableType } from "./reportTypes";

// ---------------------------------------------------------------------------
// Text screening
// ---------------------------------------------------------------------------

// Leetspeak / homoglyph substitutions, so "n1gg3r" and "f@ggot" don't slip past.
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a",
  "5": "s", "$": "s", "7": "t", "8": "b", "9": "g", "|": "i",
};

/**
 * Normalize text for matching: strip accents, fold leetspeak, collapse
 * separators and repeated letters ("f  u  c  k", "fuuuck" → "fuck") so padding
 * tricks don't defeat the filter.
 */
function normalize(input: string): string {
  const folded = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining accents
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("");

  return folded
    .replace(/[^a-z0-9\s]/g, " ") // punctuation → space
    .replace(/(.)\1{2,}/g, "$1$1") // fuuuuck → fuuck
    .replace(/\s+/g, " ")
    .trim();
}

// A second pass with all whitespace removed catches "n i g g e r". Terms shorter
// than this are skipped in that pass — they'd collide with innocent substrings.
const DESPACED_MIN_LEN = 6;

export interface ScreenResult {
  ok: boolean;
  category?: BlockedCategory;
  /** Message safe to show the poster. */
  message?: string;
  /** True when the match should also open a moderation report automatically. */
  escalate?: boolean;
}

/**
 * Screen a piece of user text before it is stored. Returns `{ ok: true }` for
 * anything clean; callers must reject the write when `ok` is false.
 */
export function screenText(input: string | null | undefined): ScreenResult {
  if (!input) return { ok: true };

  const normalized = normalize(input);
  if (!normalized) return { ok: true };
  const despaced = normalized.replace(/\s/g, "");

  // Severity order, not object order: a phrase matching both "csam" and the
  // milder "sexual" list must be reported as the former, since that's what
  // decides whether it gets escalated to the moderation queue.
  const bySeverity: BlockedCategory[] = ["csam", "violence", "hate", "sexual"];

  for (const category of bySeverity) {
    for (const term of BLOCKED_TERMS[category] ?? []) {
      const normTerm = normalize(term);
      if (!normTerm) continue;

      // Word-boundary match on the spaced form.
      const pattern = new RegExp(`(^|\\s)${escapeRegex(normTerm)}(\\s|$)`);
      const despacedTerm = normTerm.replace(/\s/g, "");
      const hit =
        pattern.test(normalized) ||
        (despacedTerm.length >= DESPACED_MIN_LEN && despaced.includes(despacedTerm));

      if (hit) {
        return {
          ok: false,
          category,
          message: `This can't be posted — it looks like ${CATEGORY_LABEL[category]}. SETLST has zero tolerance for objectionable content; see our Terms of Use.`,
          escalate: ESCALATE.includes(category),
        };
      }
    }
  }

  return { ok: true };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

/**
 * Every user id `me` cannot interact with — people they blocked *and* people who
 * blocked them. Blocking is symmetric for visibility so neither side can see or
 * reach the other.
 */
export async function blockedIds(me: string | null | undefined): Promise<string[]> {
  if (!me) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: me }, { blockedId: me }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.blockerId === me ? r.blockedId : r.blockerId);
  return [...ids];
}

/** True when either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const hit = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!hit;
}

/**
 * Prisma `where` fragment that hides content authored by blocked users. Spread
 * into a query: `where: { ...notFromBlocked(ids), albumSpotifyId }`.
 */
export function notFromBlocked(ids: string[], field = "userId") {
  return ids.length ? { [field]: { notIn: ids } } : {};
}

// ---------------------------------------------------------------------------
// Posting eligibility
// ---------------------------------------------------------------------------

export interface PostingCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Suspended accounts keep read access (so they can appeal or export/delete their
 * data) but cannot create content, message, or follow.
 */
export async function canPost(userId: string): Promise<PostingCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedAt: true, suspendedReason: true },
  });
  if (!user) return { allowed: false, reason: "Account not found." };
  if (user.suspendedAt) {
    return {
      allowed: false,
      reason:
        user.suspendedReason ||
        "Your account is suspended for violating our Terms of Use. Email support@setlst.dev to appeal.",
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * File a report raised by the filter itself (rather than by a person), so
 * escalating categories are reviewed even though the post was rejected.
 */
export async function autoReport(opts: {
  reporterId: string;
  contentType: ReportableType;
  contentId: string;
  category: BlockedCategory;
  snapshot: string;
}): Promise<void> {
  try {
    await prisma.report.create({
      data: {
        contentType: opts.contentType,
        contentId: opts.contentId,
        reason: opts.category === "csam" ? "sexual" : "violence",
        details: `Automatically flagged by the content filter (${opts.category}). The post was rejected before it was stored.`,
        snapshot: opts.snapshot.slice(0, 2000),
        reporterId: opts.reporterId,
        reportedUserId: opts.reporterId,
      },
    });
  } catch {
    // Never let moderation bookkeeping break the user-facing request.
  }
}
