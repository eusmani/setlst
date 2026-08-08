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
/** What a pick actually did, so callers stop having to infer it from `null`. */
export type PhotoPick =
  | { status: "ok"; dataUrl: string }
  | { status: "cancelled" }
  | { status: "unavailable" }          // plugin not in this build
  | { status: "failed"; reason: string };

/**
 * Pick or shoot a photo using the native camera UI.
 *
 * Returns a tagged result rather than `string | null`. The null version
 * conflated "you cancelled", "the plugin is missing" and "the pick worked but
 * produced nothing readable" — and the third case looked exactly like the
 * first: the picker opened, you chose a photo, and nothing happened.
 */
export async function pickPhoto(source: PhotoSource = "prompt"): Promise<PhotoPick> {
  if (!isNative()) return { status: "unavailable" };

  let Camera, CameraResultType, CameraSource;
  try {
    ({ Camera, CameraResultType, CameraSource } = await import("@capacitor/camera"));
  } catch {
    return { status: "unavailable" };
  }

  let photo;
  try {
    photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      // "prompt" lets iOS offer Camera vs Photo Library in its own sheet.
      source:
        source === "camera" ? CameraSource.Camera
        : source === "photos" ? CameraSource.Photos
        : CameraSource.Prompt,
      // Deliberately no `width`: the plugin's own downscale is an extra step
      // that can come back with nothing, and every caller crops client-side
      // anyway, so asking for it bought nothing and could lose the photo.
    });
  } catch (error) {
    const message = String((error as Error)?.message ?? "");
    if (/cancel/i.test(message) || /no image/i.test(message)) return { status: "cancelled" };
    return { status: "failed", reason: message || "the camera returned an error" };
  }

  if (photo.dataUrl) return { status: "ok", dataUrl: photo.dataUrl };

  // dataUrl isn't always populated even when it's what was requested; iOS can
  // hand back only a local path.
  const local = photo.webPath ?? photo.path;
  if (!local) return { status: "failed", reason: "the photo came back empty" };

  try {
    const blob = await (await fetch(local)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("could not read the photo file"));
      reader.readAsDataURL(blob);
    });
    return { status: "ok", dataUrl };
  } catch (error) {
    return { status: "failed", reason: String((error as Error)?.message ?? "could not read the photo") };
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
