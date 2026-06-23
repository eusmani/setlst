"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const NAV = [
  {
    href: "/", label: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <polyline points="9,21 9,12 15,12 15,21"/>
      </svg>
    ),
  },
  {
    href: "/search", label: "Albums",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer record */}
        <circle cx="12" cy="12" r="10"/>
        {/* Groove rings */}
        <circle cx="12" cy="12" r="7" strokeWidth="0.8" strokeOpacity="0.5"/>
        <circle cx="12" cy="12" r="4.5" strokeWidth="0.8" strokeOpacity="0.5"/>
        {/* Label area */}
        <circle cx="12" cy="12" r="2.5" strokeWidth="1.4"/>
        {/* Center hole */}
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: "/charts", label: "Trending",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 14l4-4 3 3 5-6"/>
      </svg>
    ),
  },
  {
    href: "/members", label: "Friends",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/diary", label: "News",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="16" y2="11"/>
        <line x1="8" y1="15" x2="12" y2="15"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the user dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!userOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userOpen]);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#111111]/96 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link href="/" className="app-logo flex items-center gap-2 font-serif text-3xl font-bold tracking-wide text-[#f0f0f0] hover:text-[#c4a832] transition-colors shrink-0">
          <img src="/turntable-logo.png" alt="" className="w-12 h-12 shrink-0 object-contain" />
          SETLST
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center justify-around flex-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`p-3 rounded-md transition-colors relative group ${
                  active
                    ? "bg-[#222222] text-[#c4a832]"
                    : "text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]"
                }`}
              >
                {icon}
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-[#222222] text-[#f0f0f0] text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#2e2e2e]">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#222222] border border-[#2e2e2e] flex items-center justify-center text-[10px]  text-[#c4a832]">
                  {session.user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="nav-username text-sm text-[#f0f0f0] hidden sm:block">{session.user.username}</span>
                <svg className="text-[#6b6b6b] hidden sm:block" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </button>

              {userOpen && (
                <>
                  <div className="absolute right-0 top-10 z-20 w-44 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg overflow-hidden shadow-2xl">
                    <div className="px-4 py-2.5 border-b border-[#1f1f1f]">
                      <p className="text-xs text-[#6b6b6b]">Signed in as</p>
                      <p className="text-sm  text-[#f0f0f0] truncate">{session.user.username}</p>
                    </div>
                    <Link
                      href={`/profile/${session.user.username}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                      Profile
                    </Link>
                    <Link
                      href="/search"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      Log an album
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Settings
                    </Link>
                    <div className="border-t border-[#1f1f1f]">
                      <button
                        onClick={() => { setUserOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:bg-[#222222] hover:text-[#f0f0f0] transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className="text-sm text-[#a0a0a0] hover:text-[#f0f0f0] px-3 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="text-sm bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]  px-3 py-1.5 rounded-md transition-colors">
                Join
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-1.5 rounded-md text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors"
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>

      {/* Mobile right-side sliding drawer (outside <nav> so its `fixed` isn't
          trapped by the nav's backdrop-filter containing block) */}
      <div className={`sm:hidden fixed inset-0 z-[60] ${mobileOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileOpen}>
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
        />
        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-64 max-w-[82%] bg-[#111111] border-l border-[#1f1f1f] shadow-2xl flex flex-col transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#1f1f1f] shrink-0">
            <span className="text-xs text-[#6b6b6b] uppercase tracking-[0.15em]">Menu</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1.5 rounded-md text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {NAV.map(({ href, label, icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active ? "bg-[#222222] text-[#c4a832]" : "text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-[#1f1f1f] space-y-1">
              {session ? (
                <>
                  <Link href={`/profile/${session.user.username}`} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    Profile
                  </Link>
                  <Link href="/search" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Log an album
                  </Link>
                  <Link href="/settings" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </Link>
                  <button onClick={() => { setMobileOpen(false); signOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md text-sm text-[#a0a0a0] hover:text-[#f0f0f0] border border-[#2e2e2e] transition-colors">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md text-sm bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] transition-colors">
                    Join
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
