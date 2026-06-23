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

// Returns the phone numbers found in the user's contacts (native), or null when
// not available so callers can fall back to a share-invite.
export async function readContactPhones(): Promise<string[] | null> {
  if (isNative()) {
    try {
      const { Contacts } = await import("@capacitor-community/contacts");
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== "granted") return null;
      const res = await Contacts.getContacts({ projection: { phones: true } });
      const nums: string[] = [];
      for (const c of res.contacts ?? []) {
        for (const p of c.phones ?? []) if (p.number) nums.push(p.number);
      }
      return nums;
    } catch {
      return null;
    }
  }
  // Web: try the Contact Picker API
  try {
    const nav = navigator as Navigator & {
      contacts?: { select: (p: string[], o: { multiple: boolean }) => Promise<Array<{ tel?: string[] }>> };
    };
    if (nav.contacts?.select) {
      const picked = await nav.contacts.select(["tel"], { multiple: true });
      return picked.flatMap((c) => c.tel ?? []);
    }
  } catch {
    /* cancelled */
  }
  return null;
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
