"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A thin top progress bar shown during laggy navigations. It only appears if a
// navigation takes longer than a short threshold, so fast/cached route changes
// don't flash it — giving feedback exactly when there's lag. Complements the
// per-route loading.tsx skeletons and covers routes that don't have one.
const DELAY_MS = 180;

export default function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arm the bar when an internal link is clicked; it only actually shows if the
  // navigation is still pending after DELAY_MS (cleared on route change below).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const target = a.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank") return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return; // external
        if (url.pathname === location.pathname) return; // same page
      } catch {
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(true), DELAY_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Route changed → navigation done. Cancel the pending arm and hide the bar.
  useEffect(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setActive(false);
  }, [pathname]);

  if (!active) return null;
  return <div className="nav-progress" aria-hidden />;
}
