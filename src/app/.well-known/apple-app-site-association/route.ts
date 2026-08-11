import { NextResponse } from "next/server";

/**
 * Apple App Site Association.
 *
 * The `webcredentials` section is what lets iOS share saved passwords between
 * setlst.dev and the app. Without it the keychain treats the app's web view as
 * an unrelated context: a password saved in Safari isn't offered in the app, and
 * one saved in the app isn't remembered next time — which is exactly the "it
 * doesn't remember my password" behaviour.
 *
 * Apple's fetcher is strict about three things, so all three are pinned here:
 * served over HTTPS, `application/json` content type, and no redirect. It must
 * live at /.well-known/apple-app-site-association with no file extension.
 *
 * `applinks` is declared empty on purpose. Claiming setlst.dev paths as
 * universal links would make iOS open this app for its own URLs — including the
 * links in password-reset and verification emails, which need to open a browser.
 */
const ASSOCIATION = {
  applinks: { apps: [], details: [] },
  webcredentials: { apps: ["KUDG5M87G9.app.setlst.native"] },
};

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(ASSOCIATION, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
