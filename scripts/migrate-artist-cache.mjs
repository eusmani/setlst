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
const env = { ...readEnv("../.env"), ...readEnv("../.env.local") };

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
