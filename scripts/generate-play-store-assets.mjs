// Generates the Google Play store-listing images from assets/logo.png.
//
// Play requires both of these before a listing can be submitted, and neither is
// produced by `@capacitor/assets` (that tool only emits in-app launcher/splash
// resources, not storefront artwork).
//
//   npm run android:store-assets
//
// Output lands in assets/play/ — these are uploaded by hand in the Play Console,
// so they are deliberately NOT wired into the Gradle build.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = join(root, "assets", "logo.png");
const outDir = join(root, "assets", "play");

// Matches capacitor.config.ts backgroundColor so the storefront art, the splash
// screen, and the app's own chrome all read as one surface.
const BG = { r: 0x11, g: 0x11, b: 0x11, alpha: 1 };

await mkdir(outDir, { recursive: true });

// 1. High-res app icon — 512x512, no alpha (Play rejects transparency here).
await sharp(logo)
  .resize(512, 512, { fit: "contain", background: BG })
  .flatten({ background: BG })
  .png()
  .toFile(join(outDir, "icon-512.png"));

// 2. Feature graphic — 1024x500, shown at the top of the store listing.
// Logo + wordmark locked up horizontally and centred as a unit. A bare logo
// reads as unfinished at storefront size, and Play crops this banner narrower
// on small screens, so everything stays well inside the middle of the canvas.
const LOGO_H = 260;
const GAP = 44;
const logoBuf = await sharp(logo)
  .resize(LOGO_H, LOGO_H, { fit: "contain", background: { ...BG, alpha: 0 } })
  .png()
  .toBuffer();

// Serif wordmark to match the app's headline treatment. The SVG canvas is drawn
// deliberately oversized and then trimmed to the ink, because text advance width
// depends on which serif face the renderer actually resolves — guessing a fixed
// width clips the wordmark on some machines.
const wordmark = Buffer.from(
  `<svg width="900" height="${LOGO_H}" xmlns="http://www.w3.org/2000/svg">
     <text x="10" y="150" font-family="Georgia, 'Times New Roman', serif"
           font-size="118" font-weight="700" letter-spacing="5" fill="#ffffff">SETLST</text>
     <text x="14" y="208" font-family="Georgia, 'Times New Roman', serif"
           font-size="36" letter-spacing="2" fill="#9a9a9a">Every show. Every setlist.</text>
   </svg>`,
);
const wordBuf = await sharp(wordmark).png().trim().png().toBuffer();
const wordW = (await sharp(wordBuf).metadata()).width;
const wordH = (await sharp(wordBuf).metadata()).height;

// Centre the logo+wordmark lockup as one unit rather than centring each piece,
// and vertically centre the trimmed wordmark against the logo's optical middle.
const lockupW = LOGO_H + GAP + wordW;
const left = Math.round((1024 - lockupW) / 2);
const top = Math.round((500 - LOGO_H) / 2);
const wordTop = Math.round((500 - wordH) / 2);

if (lockupW > 1024) {
  throw new Error(`Lockup is ${lockupW}px wide and will not fit the 1024px feature graphic`);
}

await sharp({
  create: { width: 1024, height: 500, channels: 4, background: BG },
})
  .composite([
    { input: logoBuf, left, top },
    { input: wordBuf, left: left + LOGO_H + GAP, top: wordTop },
  ])
  .flatten({ background: BG })
  .png()
  .toFile(join(outDir, "feature-graphic-1024x500.png"));

console.log("Wrote assets/play/icon-512.png and assets/play/feature-graphic-1024x500.png");
