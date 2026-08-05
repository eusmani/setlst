// Generates src/lib/wordlist.ts — the blocked-term data for the content filter.
// Terms are base64-encoded in the emitted file so the source tree does not
// contain a readable wall of slurs (and so the list isn't trivially scraped).
import { writeFileSync } from "node:fs";

/** @type {Record<string, string[]>} */
const LISTS = {
  // Hate speech: slurs targeting race, ethnicity, religion, sexuality, gender
  // identity, and disability. Matched after leetspeak normalization.
  hate: [
    "nigger", "nigga", "niger", "negro", "coon", "jigaboo", "porch monkey",
    "spic", "wetback", "beaner", "chink", "gook", "jap", "zipperhead",
    "kike", "heeb", "yid", "raghead", "towelhead", "sandnigger", "camel jockey",
    "paki", "curry muncher", "gypsy scum", "kaffir", "abo", "redskin",
    "faggot", "fagot", "fag", "dyke", "tranny", "shemale", "he she",
    "retard", "retarded", "mongoloid", "spastic", "cripple",
    "white power", "heil hitler", "gas the jews", "kill all jews",
  ],
  // Sexually explicit content. SETLST is rated 12+ and has no adult section.
  sexual: [
    "cumshot", "creampie", "gangbang", "bukkake", "deepthroat", "blowjob",
    "handjob", "rimjob", "anal sex", "double penetration", "cunnilingus",
    "felching", "dogging", "hentai", "porn", "porno", "pornhub", "xvideos",
    "onlyfans leak", "nudes", "send nudes", "nsfw pics", "sex tape",
    "camgirl", "escort service", "hookup for cash",
  ],
  // Content sexualizing minors — zero tolerance, always blocked and escalated.
  csam: [
    "child porn", "childporn", "cp video", "loli", "lolicon", "shota",
    "jailbait", "pedo", "pedophile", "underage nudes", "preteen nudes",
    "r@ygold", "pthc",
  ],
  // Threats, violence, and self-harm encouragement.
  violence: [
    "kill yourself", "kys", "kill your self", "go die", "hang yourself",
    "slit your wrists", "drink bleach", "neck yourself", "i will kill you",
    "im going to kill you", "i will find you and kill", "shoot up the school",
    "school shooting threat", "bomb threat", "i will rape you", "rape you",
    "you should die", "end your life",
  ],
};

/** @type {Record<string,string>} */
const LABELS = {
  hate: "hate speech or a slur",
  sexual: "sexually explicit content",
  csam: "content that sexualizes minors",
  violence: "threats, violence, or self-harm",
};

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");

const body = Object.entries(LISTS)
  .map(([cat, terms]) => {
    const encoded = terms.map((t) => `    "${b64(t)}",`).join("\n");
    return `  ${cat}: [\n${encoded}\n  ],`;
  })
  .join("\n");

const labels = Object.entries(LABELS)
  .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
  .join("\n");

const out = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-wordlist.mjs src/lib/wordlist.ts
//
// Blocked-term data for the user-generated-content filter (App Store guideline
// 1.2). Terms are base64-encoded so this file isn't a readable wall of slurs in
// the repo and isn't trivially scraped from the client bundle; the filter runs
// server-side and decodes once at module load.

export type BlockedCategory = "hate" | "sexual" | "csam" | "violence";

const ENCODED: Record<BlockedCategory, string[]> = {
${body}
};

/** Human-readable reason shown to the poster when a category matches. */
export const CATEGORY_LABEL: Record<BlockedCategory, string> = {
${labels}
};

/** Categories that are escalated to the moderation queue, not just rejected. */
export const ESCALATE: BlockedCategory[] = ["csam", "violence"];

const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");

export const BLOCKED_TERMS: Record<BlockedCategory, string[]> = Object.fromEntries(
  Object.entries(ENCODED).map(([cat, list]) => [cat, list.map(decode)])
) as Record<BlockedCategory, string[]>;
`;

writeFileSync(process.argv[2], out);
console.log("wrote", process.argv[2]);
