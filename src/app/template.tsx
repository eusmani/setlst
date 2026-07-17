"use client";
import * as React from "react";

// React 19's <ViewTransition> drives the native-style page slides. It ships in
// the React that Next bundles at runtime, but isn't on the stable `react` type
// surface yet, so we read it off the namespace with a small typed shim.
const ViewTransition = (
  React as unknown as {
    ViewTransition: React.ComponentType<{
      enter?: Record<string, string>;
      exit?: Record<string, string>;
      children: React.ReactNode;
    }>;
  }
).ViewTransition;

// A template remounts on every navigation, so React runs the ViewTransition
// enter/exit animations as one page replaces another. Direction comes from the
// navigation's transition type (set by <Link transitionTypes> or router push
// options): `nav-back` slides from the left (going back); everything else —
// tapping an album, paging forward — slides in from the right. The keyframes
// live in globals.css under .nav-forward / .nav-back.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-back": "nav-back", default: "nav-forward" }}
      exit={{ "nav-back": "nav-back", default: "nav-forward" }}
    >
      {children}
    </ViewTransition>
  );
}
