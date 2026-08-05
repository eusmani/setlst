// One-time backfill for User.phoneHash.
//
// Contact matching moved from comparing raw phone numbers to comparing SHA-256
// digests (App Store guideline 5.1.2), so members who saved a number before that
// change have `phone` but no `phoneHash` and would be invisible to
// find-your-friends until they re-saved it. This computes the missing hashes.
//
//   node scripts/backfill-phone-hashes.mjs           # apply
//   node scripts/backfill-phone-hashes.mjs --dry-run # count only
//
// Defaults to the local dev.db. Against production, export Turso credentials
// for the single command:
//   DATABASE_URL=… TURSO_AUTH_TOKEN=… node scripts/backfill-phone-hashes.mjs
//
// Safe to re-run: it only touches rows where phoneHash is null.

import { createClient } from "@libsql/client";
import path from "node:path";

// Kept in sync with src/lib/phone.ts — same normalization and the same domain
// separator, or these digests won't match the ones the client sends.
const PHONE_HASH_PREFIX = "setlst:phone:v1:";

function normalizePhone(raw) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

async function hashPhone(raw) {
  const normalized = normalizePhone(raw);
  if (!normalized) return null;
  const bytes = new TextEncoder().encode(PHONE_HASH_PREFIX + normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const dryRun = process.argv.includes("--dry-run");
const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, ...(authToken ? { authToken } : {}) });

const { rows } = await db.execute(
  "SELECT id, username, phone FROM User WHERE phone IS NOT NULL AND phoneHash IS NULL"
);

console.log(`${rows.length} account(s) need a phone hash. (${url.split("?")[0]})`);

if (dryRun) {
  console.log("Dry run — nothing written.");
} else {
  let hashed = 0;
  let cleared = 0;
  for (const row of rows) {
    const phoneHash = await hashPhone(row.phone);
    if (!phoneHash) {
      // Stored number is too short to be real — clear it rather than leave a
      // value that can never match anything.
      await db.execute({ sql: "UPDATE User SET phone = NULL WHERE id = ?", args: [row.id] });
      cleared++;
      continue;
    }
    await db.execute({
      sql: "UPDATE User SET phoneHash = ? WHERE id = ?",
      args: [phoneHash, row.id],
    });
    hashed++;
  }
  console.log(`Hashed ${hashed} account(s).${cleared ? ` Cleared ${cleared} unparseable number(s).` : ""}`);
}
