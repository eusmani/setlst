"use client";
import { usePathname } from "next/navigation";

// Wraps every route's content. Next.js unmounts + remounts this on each
// navigation, so the CSS slide-in re-runs on every page change — a consistent
// forward "slide" that works reliably inside WKWebView, where the View
// Transitions API and animate-on-a-persistent-node approaches did not. The app
// chrome (navbar / bottom nav) lives in layout.tsx and stays put; only the page
// content slides. Reverse navigation keeps the native back-swipe.
//
// Except between the bottom-nav tabs. A native tab bar swaps instantly — tabs
// are siblings, not somewhere you travelled to — so sliding Albums in from the
// right when you tap it reads as going deeper, which it isn't. The routes the
// tabs point at skip the animation; anything below them still slides.
const TAB_ROOTS = new Set(["/", "/search", "/activity", "/log"]);

function isTabRoot(pathname: string): boolean {
  if (TAB_ROOTS.has(pathname)) return true;
  // The Profile tab lands on /profile/<username>; its sub-pages are deeper.
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "profile";
}

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={isTabRoot(pathname) ? undefined : "page-transition"}>{children}</div>;
}
