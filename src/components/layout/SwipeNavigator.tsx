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

// Global swipe-to-page-between-sections. Renders nothing; attaches passive touch
// listeners on phone-sized viewports (where the tab bar is primary navigation).
export default function SwipeNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  // Resolved Profile-tab target for the signed-in user (same source as BottomNav).
  const profileHref = useRef<string>("/login");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d?.username) profileHref.current = `/profile/${d.username}`; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Only wire up where the mobile tab bar is the navigation (matches sm:hidden).
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    const idx = sectionIndex(pathname);
    if (idx === -1) return;

    const resolve = (i: number) => (SECTIONS[i] === "/profile" ? profileHref.current : SECTIONS[i]);

    // Prefetch neighbours so the swipe transition lands instantly.
    if (idx > 0) router.prefetch(resolve(idx - 1));
    if (idx < SECTIONS.length - 1) router.prefetch(resolve(idx + 1));

    let sx = 0, sy = 0, tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || inHorizontalScroller(e.target)) { tracking = false; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      // Comfortable, mostly-horizontal threshold so it never fights page scroll.
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const next = idx + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= SECTIONS.length) return;
      router.push(resolve(next));
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
