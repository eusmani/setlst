"use client";
import { useEffect, useState } from "react";
import { GREETINGS, GREETING_COOKIE, GREETING_SESSION_KEY, greetingAt } from "@/lib/greetings";

// The greeting is fixed for a session and changes on a fresh launch.
//
// "Session" is the web view's lifetime, which in the native shell is one app
// launch: sessionStorage is cleared when the web view is torn down, so its
// absence is the signal for "cold launch".
//
// The server renders from a cookie so the first paint is already correct and
// navigating Home → Albums → Home doesn't reshuffle the greeting. This component
// only steps in on a fresh launch, when it picks a new one and records it in
// both places.
export default function HomeGreeting({
  username, initialIndex,
}: { username: string; initialIndex: number }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const remember = (value: number) => {
      document.cookie = `${GREETING_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    };

    let stored: string | null = null;
    try { stored = sessionStorage.getItem(GREETING_SESSION_KEY); } catch { /* private mode */ }

    if (stored === null) {
      // Fresh launch — choose this session's greeting.
      const next = Math.floor(Math.random() * GREETINGS.length);
      try { sessionStorage.setItem(GREETING_SESSION_KEY, String(next)); } catch { /* ignore */ }
      remember(next);
      setIndex(next);
      return;
    }

    // Same session: keep whatever was chosen at launch.
    const chosen = Number(stored);
    if (!Number.isNaN(chosen)) {
      if (chosen !== index) setIndex(chosen);
      remember(chosen);
    }
    // Runs once per mount; the session's choice shouldn't be revisited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = greetingAt(index);

  return (
    <>
      {greeting.before}
      <span className="text-[#c4a832]">{username}</span>
      {greeting.after}
    </>
  );
}
