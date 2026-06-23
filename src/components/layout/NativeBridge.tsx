"use client";
import { useEffect } from "react";

// Runs only inside the native iOS/Android shell. Styles the status bar, hides the
// splash screen once loaded, and registers for push notifications.
export default function NativeBridge() {
  useEffect(() => {
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
    })();
  }, []);

  return null;
}
