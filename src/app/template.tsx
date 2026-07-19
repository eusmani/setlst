"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A `template` remounts on navigation, but React can still reuse the wrapper DOM
// node — which means a CSS animation on it won't replay. Keying the wrapper by
// pathname forces a brand-new element each route change, so the `.page-enter`
// slide (globals.css) restarts every time.
//
// This deliberately does NOT use the View Transitions API / React <ViewTransition>:
// the iOS WKWebView doesn't reliably support its `view-transition-class` matching,
// so the slide never played on iPhone. Plain @keyframes works everywhere.
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
