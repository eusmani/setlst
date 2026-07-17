"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Ordered primary sections, mirroring the mobile BottomNav left→right. Swiping
// left advances to the next section, right to the previous — like paging through
// native tabs. The center "+" (write a review) is an action, so it's excluded.
// "/profile" is matched by prefix; the real target is resolved per-user below.
const SECTIONS = ["/", "/inbox", "/search", "/activity", "/profile"] as const;

function sectionIndex(pathname: string): number {
  if (pathname === "/") return 0;
  for (let i = 1; i < SECTIONS.length; i++) {
    if (pathname.startsWith(SECTIONS[i])) return i;
  }
  return -1;
}

// Walk up from the touch target; if any ancestor scrolls horizontally (album
// rows, filter strips) let it own the gesture instead of paging sections.
function inHorizontalScroller(node: EventTarget | null): boolean {
  let el = node as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.swipePassthrough !== undefined) return true;
    const style = getComputedStyle(el);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 4) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

// Global touch navigation on phone-sized viewports. Two gestures:
//   • Swipe from the LEFT EDGE → go back to the previous page, sliding it in from
//     the left ("nav-back") like an iOS navigation stack.
//   • Swipe anywhere else between top-level SECTIONS (tab paging), tagging the
//     direction so paging to an earlier tab reverses the slide too.
// Renders nothing; attaches passive touch listeners. Forward navigation (tapping
// an album, etc.) already slides in from the right via the default view
// transition in globals.css, so no work is needed for that direction here.
export default function SwipeNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  // Resolved Profile-tab target for the signed-in user (same source as BottomNav).
  const profileHref = useRef<string>("/login");
  // Visited-path stack so the edge gesture can slide back to the REAL previous
  // page (not just the nearest section) with the reverse animation.
  const stack = useRef<string[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d?.username) profileHref.current = `/profile/${d.username}`; })
      .catch(() => {});
  }, []);

  // Keep the visited-path stack in sync with navigation: pop when we return to
  // the prior entry (a back), push when we move somewhere new (forward).
  useEffect(() => {
    const s = stack.current;
    if (s.length >= 2 && s[s.length - 2] === pathname) s.pop();
    else if (s[s.length - 1] !== pathname) s.push(pathname);
  }, [pathname]);

  useEffect(() => {
    // Only wire up where the mobile tab bar is the navigation (matches sm:hidden).
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    const idx = sectionIndex(pathname);
    const resolve = (i: number) => (SECTIONS[i] === "/profile" ? profileHref.current : SECTIONS[i]);

    // Prefetch section neighbours so tab paging lands instantly.
    if (idx > 0) router.prefetch(resolve(idx - 1));
    if (idx >= 0 && idx < SECTIONS.length - 1) router.prefetch(resolve(idx + 1));

    const EDGE = 28;   // px from the left edge that starts a "back" gesture
    const DIST = 60;   // min horizontal travel to count as a swipe
    let sx = 0, sy = 0, tracking = false, fromEdge = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      fromEdge = sx <= EDGE;
      // Inside a horizontal scroller, let it own the gesture — unless this began
      // at the very edge, where a back-swipe should still win.
      if (!fromEdge && inHorizontalScroller(e.target)) { tracking = false; return; }
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      // Mostly-horizontal, comfortable threshold so it never fights page scroll.
      if (Math.abs(dx) < DIST || Math.abs(dx) < Math.abs(dy) * 1.6) return;

      // Left-edge swipe right → back to the actual previous page.
      if (fromEdge && dx > 0) {
        const s = stack.current;
        if (s.length > 1) {
          router.push(s[s.length - 2], { transitionTypes: ["nav-back"] });
        } else {
          router.back();
        }
        return;
      }

      // Otherwise page between top-level sections (unchanged behaviour), tagging
      // a right-swipe (previous tab) as nav-back so it slides from the left.
      if (idx === -1) return;
      const goBack = dx > 0;
      const next = idx + (goBack ? -1 : 1);
      if (next < 0 || next >= SECTIONS.length) return;
      router.push(resolve(next), goBack ? { transitionTypes: ["nav-back"] } : undefined);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pathname, router]);

  return null;
}
