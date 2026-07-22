// Wraps every route's content. Next.js unmounts + remounts this on each
// navigation, so the CSS slide-in below re-runs on every page change — a
// consistent forward "slide" that works reliably inside WKWebView, where the
// View Transitions API and animate-on-a-persistent-node approaches did not.
// The app chrome (navbar / bottom nav) lives in layout.tsx and stays put; only
// the page content slides. Reverse navigation keeps the native back-swipe.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
