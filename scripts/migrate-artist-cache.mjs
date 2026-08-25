import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

// Prisma can't migrate Turso (the engine only accepts file: URLs), so schema
// changes are hand-written raw SQL against the libSQL client.
// DATABASE_URL lives in .env and the auth token in .env.local, so both are read.
function readEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(new URL(file, import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        })
    );
  } catch {
    return {};
  }
}
// .env carries a local file: URL for development; the production Turso
// credentials are in .env.production.local and must win, or the migration
// silently creates the table in dev.db and production still lacks it.
const env = { ...readEnv("../.env"), ...readEnv("../.env.local"), ...readEnv("../.env.production.local") };

console.log(`  target: ${env.DATABASE_URL?.startsWith("file:") ? "LOCAL " + env.DATABASE_URL : "production Turso"}`);
const client = createClient({ url: env.DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

try {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ArtistDiscographyCache (
      name      TEXT PRIMARY KEY,
      payload   TEXT NOT NULL,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("ArtistDiscographyCache ready");
  const r = await client.execute("SELECT COUNT(*) AS n FROM ArtistDiscographyCache");
  console.log("rows:", r.rows[0].n);
} catch (e) {
  console.error("migration failed:", e.message);
  process.exit(1);
}
