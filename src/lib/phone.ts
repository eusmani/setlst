// Normalize a phone number for matching: digits only, last 10 (ignores country
// code / formatting differences so "+1 (555) 123-4567" matches "5551234567").
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

// Domain separator, so these digests are only meaningful to SETLST.
const PHONE_HASH_PREFIX = "setlst:phone:v1:";

/**
 * SHA-256 of a normalized phone number, used for contact matching.
 *
 * Find-your-friends hashes the numbers on the device and sends only digests, so
 * the plaintext contents of someone's address book never reach our servers and
 * are never written to disk (App Store guideline 5.1.2 — contact data is used
 * only for the disclosed purpose). This is not a secret-keyed MAC: a 10-digit
 * space is small enough to brute-force offline, so the protection it buys is
 * "we don't receive or retain your contacts' numbers", not "these digests are
 * irreversible". Matching happens in memory and nothing about non-members is
 * stored either way.
 *
 * Runs on both the client (Web Crypto) and the server (Node's webcrypto).
 */
export async function hashPhone(raw: string | null | undefined): Promise<string | null> {
  const normalized = normalizePhone(raw);
  if (!normalized) return null;
  const bytes = new TextEncoder().encode(PHONE_HASH_PREFIX + normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a batch of raw numbers, dropping anything unparseable. */
export async function hashPhones(raws: string[]): Promise<string[]> {
  const hashes = await Promise.all(raws.map(hashPhone));
  return [...new Set(hashes.filter((h): h is string => !!h))];
}
