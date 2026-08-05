// Applies the moderation / privacy schema changes (App Store guidelines 1.2,
// 5.1.1, 5.1.2) to a Turso database.
//
//   node scripts/migrate-moderation.mjs --dry-run   # show what would run
//   node scripts/migrate-moderation.mjs             # apply
//
// Defaults to the local dev.db. Against production, export Turso credentials:
//   DATABASE_URL=… TURSO_AUTH_TOKEN=… node scripts/migrate-moderation.mjs
//
// WHY RAW SQL RATHER THAN `prisma migrate deploy` / `prisma db push`:
// Prisma's migration engine only speaks `file:` SQLite URLs — pointed at a
// `libsql://` URL it fails with P1013 before it does anything. Turso schema
// changes in this repo have always been hand-written for that reason (see
// scripts/migrate-private.mjs, which added User.isPrivate the same way).
//
// WHY ADDITIVE `ALTER TABLE` RATHER THAN PRISMA'S GENERATED SQL:
// `prisma migrate diff` renders these changes as a full table rebuild — DROP
// TABLE "User" / rename-in-place — because SQLite can't reorder columns. Those
// rebuilds are cosmetic (production's columns match, they're just declared in a
// different order after earlier ALTERs), and dropping a live User table to
// reorder its columns is not a trade worth making. Column order is irrelevant
// to Prisma Client, so we add columns in place instead.
//
// Safe to re-run: every statement is guarded, and already-applied changes are
// reported as skipped rather than failing.

import { createClient } from "@libsql/client";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, ...(authToken ? { authToken } : {}) });

/**
 * Statements are ordered so tables exist before their indexes.
 *
 * Deliberately no `IF NOT EXISTS`: letting each statement fail and classifying
 * the error is what makes the applied-vs-skipped counts truthful on a re-run.
 * With `IF NOT EXISTS`, re-running reports every table and index as freshly
 * applied when nothing actually happened.
 */
const STATEMENTS = [
  // Soft-delete markers, so a moderator can hide content without destroying the
  // evidence attached to the report it came from.
  `ALTER TABLE "Review" ADD COLUMN "removedAt" DATETIME`,
  `ALTER TABLE "Comment" ADD COLUMN "removedAt" DATETIME`,
  `ALTER TABLE "Thread" ADD COLUMN "removedAt" DATETIME`,
  `ALTER TABLE "ThreadReply" ADD COLUMN "removedAt" DATETIME`,
  `ALTER TABLE "DirectMessage" ADD COLUMN "removedAt" DATETIME`,

  // Contact matching by digest (5.1.2), suspension state, moderator flag, and
  // recorded EULA acceptance (1.2).
  `ALTER TABLE "User" ADD COLUMN "phoneHash" TEXT`,
  `ALTER TABLE "User" ADD COLUMN "suspendedAt" DATETIME`,
  `ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT`,
  `ALTER TABLE "User" ADD COLUMN "isModerator" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" DATETIME`,
  `ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT`,

  `CREATE TABLE "Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "snapshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" DATETIME,
    "resolverNote" TEXT,
    "reporterId" TEXT,
    "reportedUserId" TEXT,
    "resolvedById" TEXT,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,

  `CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId")`,
  `CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId")`,
  `CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId")`,
  `CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt")`,
  `CREATE INDEX "Report_contentType_contentId_idx" ON "Report"("contentType", "contentId")`,
  `CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId")`,
];

/** True when the error just means the change is already in place. */
function alreadyApplied(message) {
  return /duplicate column name|already exists/i.test(message ?? "");
}

const label = (sql) => sql.replace(/\s+/g, " ").slice(0, 72);

console.log(`${dryRun ? "DRY RUN — " : ""}target: ${url.split("?")[0]}\n`);

let applied = 0;
let skipped = 0;

for (const sql of STATEMENTS) {
  if (dryRun) {
    console.log(`  would run: ${label(sql)}…`);
    continue;
  }
  try {
    await db.execute(sql);
    console.log(`  applied: ${label(sql)}…`);
    applied++;
  } catch (err) {
    if (alreadyApplied(err.message)) {
      console.log(`  skipped (already applied): ${label(sql)}…`);
      skipped++;
    } else {
      console.error(`\nFAILED on: ${label(sql)}…\n${err.message}`);
      process.exit(1);
    }
  }
}

if (!dryRun) {
  console.log(`\nDone — ${applied} applied, ${skipped} already in place.`);
  console.log("Next: node scripts/backfill-phone-hashes.mjs");
}
