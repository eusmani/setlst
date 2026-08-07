import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Wallpoet, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import VerifyBanner from "@/components/layout/VerifyBanner";
import RegisterSW from "@/components/layout/RegisterSW";
import UpcomingBanner from "@/components/layout/UpcomingBanner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import NativeBridge from "@/components/layout/NativeBridge";
import NativeExtras from "@/components/layout/NativeExtras";
import NativeLinks from "@/components/layout/NativeLinks";
import NativeTaps from "@/components/layout/NativeTaps";
import OfflineNotice from "@/components/layout/OfflineNotice";
import SuspensionBanner from "@/components/layout/SuspensionBanner";
import OnboardingSlideshow from "@/components/layout/OnboardingSlideshow";
import NavProgress from "@/components/layout/NavProgress";

const wallpoet = Wallpoet({ variable: "--font-wallpoet", subsets: ["latin"], weight: "400" });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "SETLST — Music Reviews",
  description: "Track every album you listen to, rate your favorites, explore complete discographies, and discover the next new artist in your rotation.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SETLST",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  // Keep the app fixed in place — no pinch / focus zoom inside the native shell.
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme is stored in a cookie so the server renders the correct theme class —
  // server and client agree, and navigating between pages never resets it.
  const cookieTheme = (await cookies()).get("setlst-theme")?.value;
  const theme = cookieTheme === "mono" ? "mono" : "amber";

  return (
    <html lang="en" suppressHydrationWarning className={`theme-${theme} ${wallpoet.variable} ${jakarta.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Migrate legacy localStorage choice into a cookie on first load, then keep class in sync.
            __html: `try{var m=document.cookie.match(/(?:^|; )setlst-theme=([^;]+)/);var t=m?m[1]:(localStorage.getItem('setlst-theme')||'amber');if(!m){document.cookie='setlst-theme='+t+'; path=/; max-age=31536000; samesite=lax';}var c=document.documentElement.classList;c.remove('theme-mono','theme-amber');c.add('theme-'+t);}catch(e){}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            // On the native app's first launch (not yet onboarded), synchronously
            // cover the screen so the underlying app/login page never flashes
            // before the React onboarding overlay mounts. Removed by the overlay
            // when onboarding is dismissed. Must match OnboardingSlideshow SEEN_KEY.
            __html: `try{if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&!localStorage.getItem('setlst_onboarded_v1')){document.documentElement.classList.add('onb-pending');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#111111] text-[#f0f0f0] overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {/* Pre-hydration onboarding cover — see globals.css #onb-preload and the
            head script that toggles .onb-pending. Hidden unless first launch. */}
        <div id="onb-preload" aria-hidden="true">
          <img src="/turntable-logo.png" alt="" style={{ width: "11rem", height: "11rem", objectFit: "contain" }} />
        </div>
        <Providers>
          <NavProgress />
          <RegisterSW />
          <NativeBridge />
          <NativeExtras />
          <NativeLinks />
          <NativeTaps />
          <OfflineNotice />
          <SuspensionBanner />
          <OnboardingSlideshow />
          <Navbar />
          {/* Desktop only: offsets the fixed navbar (h-16). On phones the navbar
              floats over the page and takes no layout space, so a spacer there
              would reintroduce the very gap it was removed to close. */}
          <div className="hidden sm:block h-16 shrink-0" aria-hidden />
          <UpcomingBanner />
          <BottomNav />
          <VerifyBanner />
          <main className="flex-1">{children}</main>
          <footer className="mt-auto border-t border-[#1f1f1f] py-5 text-center text-xs text-[#6b6b6b]">
            <strong>SETLST</strong> · log the music you love
            <span className="mx-2 text-[#2e2e2e]">·</span>
            <a href="/privacy" className="hover:text-[#c4a832] transition-colors">Privacy</a>
            <span className="mx-2 text-[#2e2e2e]">·</span>
            <a href="/terms" className="hover:text-[#c4a832] transition-colors">Terms</a>
            <span className="mx-2 text-[#2e2e2e]">·</span>
            <a href="/support" className="hover:text-[#c4a832] transition-colors">Support</a>
            <div className="mt-2 text-[#6b6b6b]">© {new Date().getFullYear()} Ebaad Usmani. All rights reserved.</div>
          </footer>
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
