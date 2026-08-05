// Shared moderation constants — safe to import from client components.
// `@/lib/moderation` pulls in Prisma, so anything the UI needs lives here.

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech or symbols" },
  { value: "sexual", label: "Sexually explicit content" },
  { value: "violence", label: "Violence or threats" },
  { value: "self_harm", label: "Self-harm or suicide" },
  { value: "copyright", label: "Copyright or trademark infringement" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORTABLE_TYPES = [
  "review",
  "comment",
  "thread",
  "reply",
  "message",
  "user",
] as const;

export type ReportableType = (typeof REPORTABLE_TYPES)[number];

/** Bump when the Terms of Use or Privacy Policy change materially. */
export const TERMS_VERSION = "2026-08-04";

/** Apple asks that reports be acted on within 24 hours. */
export const MODERATION_SLA_HOURS = 24;
