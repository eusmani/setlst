"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders children at the end of <body>, outside whatever stacking context the
// caller happens to sit in.
//
// Full-screen overlays need this. The album page wraps its content in
// `relative z-10` (to sit above the fixed AlbumBackdrop), and that creates a
// stacking context — so every descendant's z-index is resolved *inside* it and
// capped at 10 in the root. A sheet asking for z-[70] still lost to the z-50
// bottom nav, which is a sibling of the page at the root. Raising the number
// can't fix that; leaving the context can.
//
// Renders nothing until mounted, since document doesn't exist during SSR. These
// overlays only ever appear after an interaction, so nothing is lost.
export default function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
