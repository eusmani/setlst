"use client";
import { useEffect } from "react";
import { isNative } from "@/lib/native";

// Makes external and `target="_blank"` links work inside the native app.
//
// WKWebView silently drops `target="_blank"` and `window.open` unless the host
// implements `createWebViewWith`, so in the app those links did nothing at all:
// the Spotify play button, YouTube track links on reviews, concert tickets,
// Discogs lookups — and, worst of all, the Terms of Use and Privacy Policy links
// in both sign-up flows, which is the agreement App Store guideline 1.2 requires
// people to be able to read before creating an account.
//
// Rather than fix 22 call sites, this intercepts the click once and hands the
// URL to the native in-app browser (SFSafariViewController), which presents over
// the app with its own Done button — so people come back to SETLST instead of
// being navigated away from it.
export default function NativeLinks() {
  useEffect(() => {
    if (!isNative()) return;

    const onClick = (event: MouseEvent) => {
      // Let modified clicks and non-primary buttons behave normally.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // Schemes the OS should handle (mailto:, tel:) are left alone — the web
      // view hands those to the system already.
      if (/^(mailto|tel|sms):/i.test(href)) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;

      const isExternal = url.origin !== window.location.origin;
      const opensNewTab = anchor.target === "_blank";
      if (!isExternal && !opensNewTab) return; // ordinary in-app navigation

      event.preventDefault();
      void (async () => {
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: url.toString(), presentationStyle: "popover" });
        } catch {
          // If the plugin is unavailable, navigating in place still beats a
          // link that does nothing.
          window.location.href = url.toString();
        }
      })();
    };

    // Capture phase, so this runs before React's own handlers.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
