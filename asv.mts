import { req } from "./asc-lib.mts";
const app = (await req("GET", "/v1/apps?limit=1")).body.data[0];
console.log(`  ${app.attributes.name}  (${app.attributes.bundleId})\n`);

const versions = (await req("GET", `/v1/apps/${app.id}/appStoreVersions?limit=5`)).body.data ?? [];
for (const v of versions) {
  const a = v.attributes;
  console.log(`  version ${a.versionString}  state=${a.appStoreState ?? a.appVersionState}  released=${a.releaseType}  created=${a.createdDate}`);
  const b = (await req("GET", `/v1/appStoreVersions/${v.id}/build`)).body.data;
  console.log(`    build attached: ${b ? b.attributes?.version ?? b.id : "NONE"}`);
  const rd = (await req("GET", `/v1/appStoreVersions/${v.id}/appStoreReviewDetail`)).body.data;
  const r = rd?.attributes ?? {};
  console.log(`    review contact: ${r.contactEmail || "MISSING"}   demo: ${r.demoAccountName || "MISSING"} ${r.demoAccountPassword ? "(pw set)" : ""}`);
  console.log(`    notes: ${r.notes ? r.notes.slice(0, 60).replace(/\n/g, " ") + "…" : "MISSING"}`);
  const subs = (await req("GET", `/v1/appStoreVersions/${v.id}/appStoreVersionSubmission`)).body.data;
  console.log(`    submission: ${subs ? "submitted" : "not submitted"}`);
  // screenshots
  const sets = (await req("GET", `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=5`)).body.data ?? [];
  for (const l of sets) {
    const shots = (await req("GET", `/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?limit=10`)).body.data ?? [];
    console.log(`    ${l.attributes.locale}: ${shots.length} screenshot set(s) — ${shots.map((s: any) => s.attributes.screenshotDisplayType).join(", ") || "none"}`);
  }
}
