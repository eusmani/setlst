// Adds the DeviceToken table (APNs push) to a Turso database.
//
//   node scripts/migrate-push.mjs --dry-run   # show what would run
//   node scripts/migrate-push.mjs             # apply
//
// Against production, export Turso credentials:
//   DATABASE_URL=… TURSO_AUTH_TOKEN=… node scripts/migrate-push.mjs
//
// Raw SQL for the same reason as scripts/migrate-moderation.mjs: Prisma's
// migration engine only speaks `file:` URLs and fails with P1013 against
// libsql://. This one is purely additive — a new table and its index — so there
// is no table rebuild to worry about here.
//
// Safe to re-run: both statements are IF NOT EXISTS.

import { createClient } from "@libsql/client";

const dryRun = process.argv.includes("--dry-run");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "DeviceToken" (
     "token"     TEXT NOT NULL PRIMARY KEY,
     "userId"    TEXT NOT NULL,
     "platform"  TEXT NOT NULL DEFAULT 'ios',
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId")
       REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   )`,
  `CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId")`,
];

const url = process.env.DATABASE_URL ?? "file:prisma/dev.db";
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

console.log(`${dryRun ? "DRY RUN against" : "Applying to"} ${url.replace(/\/\/.*@/, "//…@")}\n`);
for (const sql of STATEMENTS) {
  const label = sql.trim().split("\n")[0].slice(0, 70);
  if (dryRun) { console.log(`  would run: ${label}…`); continue; }
  try {
    await client.execute(sql);
    console.log(`  ok: ${label}…`);
  } catch (err) {
    console.error(`  FAILED: ${label}…\n    ${err.message}`);
    process.exitCode = 1;
  }
}
if (!dryRun) {
  const check = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='DeviceToken'`);
  console.log(`\nDeviceToken table present: ${check.rows.length > 0}`);
}
