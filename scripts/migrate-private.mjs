import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

// Load DATABASE_URL + TURSO_AUTH_TOKEN from .env.local
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

async function run() {
  // Add isPrivate column (ignore if it already exists)
  try {
    await client.execute(`ALTER TABLE User ADD COLUMN isPrivate INTEGER NOT NULL DEFAULT 0`);
    console.log("Added User.isPrivate");
  } catch (e) {
    console.log("isPrivate:", e.message);
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS FollowRequest (
      id TEXT PRIMARY KEY,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      requesterId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      FOREIGN KEY (requesterId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (targetId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS FollowRequest_requesterId_targetId_key ON FollowRequest(requesterId, targetId)`
  );
  console.log("Ensured FollowRequest table + index");
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
