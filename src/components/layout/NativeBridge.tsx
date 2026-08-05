"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { quickActionRoute } from "@/lib/native";

// Must match OnboardingSlideshow's SEEN_KEY.
const SEEN_KEY = "setlst_onboarded_v1";

// Runs only inside the native iOS/Android shell. Styles the status bar, hides the
// splash screen once loaded, and registers for push notifications.
export default function NativeBridge() {
  const router = useRouter();

  // Home Screen quick actions (long-press the app icon). A shortcut can launch
  // the app cold, so we drain any pending one on mount as well as listening for
  // shortcuts used while the app is already running.
  useEffect(() => {
    let remove: (() => void) | null = null;

    (async () => {
      const { Capacitor, registerPlugin } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      interface QuickActionsAPI {
        consumePending(): Promise<{ type: string | null }>;
        addListener(
          event: "quickAction",
          fn: (data: { type: string }) => void
        ): Promise<{ remove: () => void }>;
      }
      const QuickActions = registerPlugin<QuickActionsAPI>("QuickActions");

      try {
        const pending = await QuickActions.consumePending();
        const route = quickActionRoute(pending?.type);
        if (route) router.push(route);
      } catch { /* plugin unavailable */ }

      try {
        const handle = await QuickActions.addListener("quickAction", ({ type }) => {
          const route = quickActionRoute(type);
          if (route) router.push(route);
        });
        remove = () => handle.remove();
      } catch { /* plugin unavailable */ }
    })();

    return () => { remove?.(); };
  }, [router]);

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      // Status bar: light content over the dark navbar.
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {}

      // Hide the splash once the web app has loaded.
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {}

      // Push notifications: ask permission, register, forward the device token.
      const requestPush = async () => {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const perm = await PushNotifications.requestPermissions();
          if (perm.receive === "granted") {
            await PushNotifications.register();
            await PushNotifications.addListener("registration", (token) => {
              fetch("/api/push/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
              }).catch(() => {});
            });
            await PushNotifications.addListener("registrationError", () => {});
          }
        } catch {}
      };

      // Don't prompt for notifications during the first-launch onboarding — the
      // system dialog would cover the welcome screen. If onboarding is already
      // done, ask now; otherwise wait for it to finish (OnboardingSlideshow
      // dispatches "setlst:onboarded" on Get Started / Skip).
      let onboarded = true;
      try { onboarded = !!localStorage.getItem(SEEN_KEY); } catch {}
      if (onboarded) {
        void requestPush();
      } else {
        const handler = () => { removeListener?.(); void requestPush(); };
        window.addEventListener("setlst:onboarded", handler, { once: true });
        removeListener = () => window.removeEventListener("setlst:onboarded", handler);
      }
    })();

    return () => { removeListener?.(); };
  }, []);

  return null;
}
