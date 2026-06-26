"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { href: string; label: string; icon: ReactNode; plus?: boolean }[] = [
  {
    href: "/members", label: "Friends",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/search", label: "Albums",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="2.5" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/log", label: "Review", plus: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    href: "/activity", label: "Activity",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/diary", label: "News",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
];

// Native-style bottom tab bar — primary navigation on phones (hidden at sm+,
// where the top Navbar's links take over).
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#1f1f1f] bg-[#111111]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around h-14">
        {NAV.map(({ href, label, icon, plus }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          // The center "+" is a prominent yellow action button (write a review).
          if (plus) {
            return (
              <Link key={href} href={href} aria-label={label} className="flex items-center justify-center flex-1">
                <span className="flex items-center justify-center w-12 h-12 -mt-3 rounded-full bg-[#c4a832] text-[#111111] shadow-lg shadow-black/40 active:scale-95 transition-transform">
                  {icon}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] tracking-wide transition-colors ${
                active ? "text-[#c4a832]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
