// Grant or revoke moderator access — the only way into the report queue at
// /studio/moderation. There's deliberately no in-app UI for this.
//
//   node scripts/set-moderator.mjs <username>          # grant
//   node scripts/set-moderator.mjs <username> --revoke # revoke
//
// Defaults to the local dev.db. Against production, export Turso credentials
// for the single command:
//   DATABASE_URL=… TURSO_AUTH_TOKEN=… node scripts/set-moderator.mjs ebaad

import { createClient } from "@libsql/client";
import path from "node:path";

const [username, flag] = process.argv.slice(2);
if (!username) {
  console.error("usage: node scripts/set-moderator.mjs <username> [--revoke]");
  process.exit(1);
}

const grant = flag !== "--revoke";
const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, ...(authToken ? { authToken } : {}) });

const { rows } = await db.execute({
  sql: "SELECT id, username FROM User WHERE username = ?",
  args: [username.toLowerCase()],
});

if (rows.length === 0) {
  console.error(`No user named "${username}".`);
  process.exit(1);
}

await db.execute({
  sql: "UPDATE User SET isModerator = ? WHERE id = ?",
  args: [grant ? 1 : 0, rows[0].id],
});

console.log(`@${rows[0].username} is ${grant ? "now a moderator" : "no longer a moderator"}.`);
