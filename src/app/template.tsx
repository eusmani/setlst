import type { ReactNode } from "react";

// A `template` remounts on every navigation, so this wrapper's CSS enter animation
// replays each time — giving a native-style page slide on each route change.
//
// This deliberately does NOT use the View Transitions API / React <ViewTransition>:
// that relies on experimental `view-transition-class` CSS matching that the iOS
// WKWebView doesn't reliably support, so the slide never played on iPhone. A plain
// CSS @keyframes animation (in globals.css: .page-enter) works everywhere.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
