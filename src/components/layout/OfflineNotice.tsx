"use client";
import { useEffect, useState } from "react";

// Connection banner. The native shell has a launch-time error page
// (mobile-shell/error.html), but once the app is running a dropped connection
// would otherwise just make taps silently do nothing — which reads as a broken
// app. This says what happened and recovers on its own.
export default function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setRestored(false); };
    const goOnline = () => {
      setOffline(false);
      setRestored(true);
      // Refresh the page data that failed while the connection was down.
      const t = setTimeout(() => setRestored(false), 2500);
      return () => clearTimeout(t);
    };

    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-0 right-0 top-0 z-[90] px-4 py-2 text-center text-xs transition-colors pt-[max(0.5rem,env(safe-area-inset-top))] ${
        offline ? "bg-[#3a2a12] text-[#e8c76a]" : "bg-[#16301c] text-[#7fd18f]"
      }`}
    >
      {offline ? (
        <>
          You&rsquo;re offline — SETLST will reconnect automatically.{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline underline-offset-2"
          >
            Retry now
          </button>
        </>
      ) : (
        "Back online"
      )}
    </div>
  );
}
