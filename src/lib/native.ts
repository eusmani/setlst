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

// ---------------------------------------------------------------------------
// Camera / photo library
// ---------------------------------------------------------------------------

export type PhotoSource = "camera" | "photos" | "prompt";

/**
 * Pick or shoot a photo using the native camera UI, returning a data URL.
 *
 * Returns null on the web (and if the user cancels), so callers keep their
 * existing <input type="file"> path as the fallback. Inside the app this
 * replaces the web file picker with the real iOS camera and photo picker.
 */
export async function pickPhoto(source: PhotoSource = "prompt"): Promise<string | null> {
  if (!isNative()) return null;

  // Import separately from the call: a failure here means the plugin isn't in
  // the build, which callers must be able to tell apart from the user tapping
  // cancel. Collapsing both into `null` made a missing plugin look exactly like
  // a cancelled pick — nothing happens, nothing explains why.
  let Camera, CameraResultType, CameraSource;
  try {
    ({ Camera, CameraResultType, CameraSource } = await import("@capacitor/camera"));
  } catch {
    throw new Error("camera-unavailable");
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      // "prompt" lets iOS offer Camera vs Photo Library in its own sheet.
      source:
        source === "camera" ? CameraSource.Camera
        : source === "photos" ? CameraSource.Photos
        : CameraSource.Prompt,
      width: 1200,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null; // cancelled, or permission refused
  }
}

/** True when the native camera UI is available, so callers can offer it. */
export function canUseNativeCamera(): boolean {
  return isNative();
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export interface ShareInput {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Share via the native iOS share sheet, falling back to the Web Share API and
 * then to the clipboard. Returns what actually happened so the UI can confirm.
 */
export async function shareNative(input: ShareInput): Promise<"shared" | "copied" | "cancelled"> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.dialogTitle ?? input.title,
      });
      return "shared";
    } catch {
      return "cancelled"; // the sheet throws when dismissed
    }
  }

  const nav = navigator as Navigator & { share?: (d: ShareInput) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: input.title, text: input.text, url: input.url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(input.url ?? input.text ?? "");
    return "copied";
  } catch {
    return "cancelled";
  }
}

// ---------------------------------------------------------------------------
// Home Screen quick actions
// ---------------------------------------------------------------------------

/** Shortcut type (from Info.plist) → in-app route. */
const QUICK_ACTION_ROUTES: Record<string, string> = {
  "setlst.log": "/log",
  "setlst.search": "/search",
  "setlst.diary": "/diary",
  "setlst.inbox": "/inbox",
};

export function quickActionRoute(type: string | null | undefined): string | null {
  return type ? (QUICK_ACTION_ROUTES[type] ?? null) : null;
}
