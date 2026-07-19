"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Native-style page slide on every navigation. Driven by the Web Animations API
// (element.animate) rather than a CSS-on-mount animation: a CSS keyframe only
// plays when the element is newly created, and Next/React reuses this wrapper's
// DOM node across client navigations, so the CSS slide never replayed on iPhone.
// element.animate() fires unconditionally on each path change and is well
// supported in the iOS WKWebView. (The View Transitions API isn't used because
// its experimental view-transition-class matching is unreliable in WKWebView.)
export default function Template({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: "translateX(40px)", opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 340, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "backwards" }
    );
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
