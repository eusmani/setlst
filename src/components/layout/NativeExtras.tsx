"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/native";

interface RecentAlbumPayload {
  title: string;
  artist: string;
  grade?: string;
  artwork?: string | null;
}

interface WidgetBridgeAPI {
  setRecentAlbums(options: { albums: RecentAlbumPayload[] }): Promise<{ count: number }>;
  consumeSharedAlbum(): Promise<{ query: string | null }>;
}

// Native extras that only make sense inside the app (App Store guideline 4.2):
//
//  * feeds the Home Screen widget with your most recently logged albums, since
//    the widget has no session and can't fetch anything itself;
//  * picks up whatever the share extension captured — an album shared from
//    Apple Music, Spotify or Safari — and drops you into search for it.
export default function NativeExtras() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    (async () => {
      const { registerPlugin } = await import("@capacitor/core");
      const WidgetBridge = registerPlugin<WidgetBridgeAPI>("WidgetBridge");

      // A share handed off while the app was closed lands here on launch.
      try {
        const shared = await WidgetBridge.consumeSharedAlbum();
        if (!cancelled && shared?.query) {
          router.push(`/search?q=${encodeURIComponent(shared.query)}`);
          return; // don't also refresh the widget mid-navigation
        }
      } catch { /* extension absent */ }

      // Keep the widget current with what you've logged.
      try {
        const res = await fetch("/api/me/recent-albums");
        if (!res.ok) return;
        const albums = await res.json();
        if (cancelled || !Array.isArray(albums)) return;
        await WidgetBridge.setRecentAlbums({
          albums: albums.slice(0, 4).map((a: Record<string, unknown>) => ({
            title: String(a.title ?? ""),
            artist: String(a.artist ?? ""),
            grade: a.grade ? String(a.grade) : undefined,
            artwork: (a.artwork as string | null) ?? null,
          })),
        });
      } catch { /* offline, or nothing logged yet */ }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return null;
}
