// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-wordlist.mjs src/lib/wordlist.ts
//
// Blocked-term data for the user-generated-content filter (App Store guideline
// 1.2). Terms are base64-encoded so this file isn't a readable wall of slurs in
// the repo and isn't trivially scraped from the client bundle; the filter runs
// server-side and decodes once at module load.

export type BlockedCategory = "hate" | "sexual" | "csam" | "violence";

const ENCODED: Record<BlockedCategory, string[]> = {
  hate: [
    "bmlnZ2Vy",
    "bmlnZ2E=",
    "bmlnZXI=",
    "bmVncm8=",
    "Y29vbg==",
    "amlnYWJvbw==",
    "cG9yY2ggbW9ua2V5",
    "c3BpYw==",
    "d2V0YmFjaw==",
    "YmVhbmVy",
    "Y2hpbms=",
    "Z29vaw==",
    "amFw",
    "emlwcGVyaGVhZA==",
    "a2lrZQ==",
    "aGVlYg==",
    "eWlk",
    "cmFnaGVhZA==",
    "dG93ZWxoZWFk",
    "c2FuZG5pZ2dlcg==",
    "Y2FtZWwgam9ja2V5",
    "cGFraQ==",
    "Y3VycnkgbXVuY2hlcg==",
    "Z3lwc3kgc2N1bQ==",
    "a2FmZmly",
    "YWJv",
    "cmVkc2tpbg==",
    "ZmFnZ290",
    "ZmFnb3Q=",
    "ZmFn",
    "ZHlrZQ==",
    "dHJhbm55",
    "c2hlbWFsZQ==",
    "aGUgc2hl",
    "cmV0YXJk",
    "cmV0YXJkZWQ=",
    "bW9uZ29sb2lk",
    "c3Bhc3RpYw==",
    "Y3JpcHBsZQ==",
    "d2hpdGUgcG93ZXI=",
    "aGVpbCBoaXRsZXI=",
    "Z2FzIHRoZSBqZXdz",
    "a2lsbCBhbGwgamV3cw==",
  ],
  sexual: [
    "Y3Vtc2hvdA==",
    "Y3JlYW1waWU=",
    "Z2FuZ2Jhbmc=",
    "YnVra2FrZQ==",
    "ZGVlcHRocm9hdA==",
    "Ymxvd2pvYg==",
    "aGFuZGpvYg==",
    "cmltam9i",
    "YW5hbCBzZXg=",
    "ZG91YmxlIHBlbmV0cmF0aW9u",
    "Y3VubmlsaW5ndXM=",
    "ZmVsY2hpbmc=",
    "ZG9nZ2luZw==",
    "aGVudGFp",
    "cG9ybg==",
    "cG9ybm8=",
    "cG9ybmh1Yg==",
    "eHZpZGVvcw==",
    "b25seWZhbnMgbGVhaw==",
    "bnVkZXM=",
    "c2VuZCBudWRlcw==",
    "bnNmdyBwaWNz",
    "c2V4IHRhcGU=",
    "Y2FtZ2lybA==",
    "ZXNjb3J0IHNlcnZpY2U=",
    "aG9va3VwIGZvciBjYXNo",
  ],
  csam: [
    "Y2hpbGQgcG9ybg==",
    "Y2hpbGRwb3Ju",
    "Y3AgdmlkZW8=",
    "bG9saQ==",
    "bG9saWNvbg==",
    "c2hvdGE=",
    "amFpbGJhaXQ=",
    "cGVkbw==",
    "cGVkb3BoaWxl",
    "dW5kZXJhZ2UgbnVkZXM=",
    "cHJldGVlbiBudWRlcw==",
    "ckB5Z29sZA==",
    "cHRoYw==",
  ],
  violence: [
    "a2lsbCB5b3Vyc2VsZg==",
    "a3lz",
    "a2lsbCB5b3VyIHNlbGY=",
    "Z28gZGll",
    "aGFuZyB5b3Vyc2VsZg==",
    "c2xpdCB5b3VyIHdyaXN0cw==",
    "ZHJpbmsgYmxlYWNo",
    "bmVjayB5b3Vyc2VsZg==",
    "aSB3aWxsIGtpbGwgeW91",
    "aW0gZ29pbmcgdG8ga2lsbCB5b3U=",
    "aSB3aWxsIGZpbmQgeW91IGFuZCBraWxs",
    "c2hvb3QgdXAgdGhlIHNjaG9vbA==",
    "c2Nob29sIHNob290aW5nIHRocmVhdA==",
    "Ym9tYiB0aHJlYXQ=",
    "aSB3aWxsIHJhcGUgeW91",
    "cmFwZSB5b3U=",
    "eW91IHNob3VsZCBkaWU=",
    "ZW5kIHlvdXIgbGlmZQ==",
  ],
};

/** Human-readable reason shown to the poster when a category matches. */
export const CATEGORY_LABEL: Record<BlockedCategory, string> = {
  hate: "hate speech or a slur",
  sexual: "sexually explicit content",
  csam: "content that sexualizes minors",
  violence: "threats, violence, or self-harm",
};

/** Categories that are escalated to the moderation queue, not just rejected. */
export const ESCALATE: BlockedCategory[] = ["csam", "violence"];

const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");

export const BLOCKED_TERMS: Record<BlockedCategory, string[]> = Object.fromEntries(
  Object.entries(ENCODED).map(([cat, list]) => [cat, list.map(decode)])
) as Record<BlockedCategory, string[]>;
