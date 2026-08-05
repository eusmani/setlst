// Regenerates ios/App/App/Native/MosaicArtwork.swift from the web component, so
// the native home screen's album wall stays in step with the web one.
//
//   node scripts/generate-mosaic-artwork.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("src/components/layout/AlbumMosaic.tsx", "utf8");
const urls = [...new Set(src.match(/https:\/\/is1-ssl\.mzstatic\.com\/[^"]+/g) ?? [])];
if (urls.length === 0) throw new Error("No artwork URLs found — did AlbumMosaic.tsx change shape?");

writeFileSync(
  "ios/App/App/Native/MosaicArtwork.swift",
  `// GENERATED — regenerate with scripts/generate-mosaic-artwork.mjs
//
// The album wall behind the home header. These are the same covers the web
// app's AlbumMosaic renders, extracted from that component so the two can't
// drift apart. Apple Music catalogue artwork, shown at thumbnail scale purely
// as decoration for the app's own home screen.

import Foundation

enum MosaicArtwork {
    static let urls: [String] = [
${urls.map((u) => `        "${u}"`).join(",\n")}
    ]
}
`
);
console.log(`MosaicArtwork.swift: ${urls.length} covers`);
