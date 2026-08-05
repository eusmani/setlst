// Thin wrappers around Capacitor native plugins with graceful web fallbacks, so
// the same code runs as a website/PWA and inside the native iOS shell.
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export interface Coords { lat: number; lon: number }

// Current location — native Geolocation on device (WKWebView can't use the web
// geolocation API), browser geolocation on the web.
export async function getCoords(): Promise<Coords | null> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "denied") return null;
      const p = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: false });
      return { lat: p.coords.latitude, lon: p.coords.longitude };
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}

// Location, but only if the user has *already* granted it — never prompts.
//
// Background personalization must not be the thing that triggers a permission
// dialog: iOS shows the system prompt with no context, which reads as an app
// asking for location it hasn't justified (App Store guideline 5.1.1). Features
// that need a fresh prompt call getCoords() from an explicit user action.
export async function getCoordsIfAllowed(): Promise<Coords | null> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") return null;
      const p = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: false });
      return { lat: p.coords.latitude, lon: p.coords.longitude };
    } catch {
      return null;
    }
  }
  // Web: the Permissions API tells us whether asking would show a prompt.
  try {
    const state = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (state?.state !== "granted") return null;
  } catch {
    return null; // no Permissions API — don't risk an unprompted dialog
  }
  return getCoords();
}

// Light haptic tap (no-op on web).
export async function tapHaptic(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}
