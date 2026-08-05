"use client";
import { useEffect } from "react";
import { isNative, tapHaptic } from "@/lib/native";

// Light haptic on tap, inside the native app only.
//
// Pairs with the `:active` press states in globals.css: the scale is the visual
// acknowledgement, this is the physical one. Wired once here rather than at
// every call site so it covers the whole app, including anything added later.
export default function NativeTaps() {
  useEffect(() => {
    if (!isNative()) return;

    const onPointerDown = (event: PointerEvent) => {
      // Only real touches — a trackpad on a connected iPad shouldn't buzz.
      if (event.pointerType !== "touch") return;

      const target = (event.target as HTMLElement | null)?.closest?.(
        'a, button, [role="button"], summary, input[type="checkbox"], input[type="radio"]'
      );
      if (!target) return;

      // Disabled controls do nothing, so they shouldn't feel like they did.
      if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return;

      void tapHaptic();
    };

    // pointerdown, not click: the feedback should land when the finger touches,
    // the way native controls behave — waiting for click feels late.
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
