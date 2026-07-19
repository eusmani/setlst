"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Native-style page slide on every navigation, driven imperatively by the Web
// Animations API. (Diagnostic build: dramatic full-width slide, no reduced-motion
// gate, with a console log, to confirm whether the effect fires on-device.)
export default function Template({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    // eslint-disable-next-line no-console
    console.log("[page-slide] effect", pathname, "animate?", !!el && typeof el.animate === "function");
    if (!el || typeof el.animate !== "function") return;
    el.animate(
      [
        { transform: "translateX(100%)", opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 380, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "backwards" }
    );
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
