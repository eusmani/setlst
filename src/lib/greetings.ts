// Home-screen greetings. Shared so the server and the client agree on the list
// and its ordering — the index is what's persisted, not the text.
//
// Split around the username because it isn't always at the end, and it keeps the
// gold highlight in every variant.
export const GREETINGS: { before: string; after: string }[] = [
  { before: "Welcome back, ", after: "!" },
  { before: "Go on and review ", after: "!" },
  { before: "Hey ", after: ", log in your new favorites!" },
];

/** Cookie the server reads so the first paint already has the right greeting. */
export const GREETING_COOKIE = "setlst_greeting";

/** sessionStorage key. Absent means this is a fresh launch. */
export const GREETING_SESSION_KEY = "setlst.greeting";

export function greetingAt(index: number) {
  return GREETINGS[((index % GREETINGS.length) + GREETINGS.length) % GREETINGS.length];
}
