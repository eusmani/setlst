import { req } from "./asc-lib.mts";
const app = (await req("GET", "/v1/apps?limit=1")).body.data[0];

const versions = (await req("GET", `/v1/apps/${app.id}/appStoreVersions?limit=10`)).body.data ?? [];
console.log("  App Store versions:\n");
for (const v of versions) {
  const a = v.attributes;
  const state = a.appStoreState ?? a.appVersionState;
  console.log(`    ${String(a.versionString).padEnd(8)} ${String(state).padEnd(28)} releaseType=${a.releaseType}`);
  if (state === "PENDING_DEVELOPER_RELEASE") console.log("      ^^^ APPROVED, waiting for you to release");
}

// Is the app available for sale, and where?
const avail = await req("GET", `/v1/apps/${app.id}/availableTerritories?limit=3`);
console.log(`\n  territories available: ${avail.body.meta?.paging?.total ?? avail.body.data?.length ?? "?"}`);

// Price
const pp = await req("GET", `/v1/apps/${app.id}/appPriceSchedule`);
console.log(`  price schedule: ${pp.status === 200 ? "configured" : "HTTP " + pp.status}`);

// Any in-flight review submission?
const rs = await req("GET", `/v1/reviewSubmissions?filter[app]=${app.id}&limit=5`);
for (const s of rs.body.data ?? []) {
  console.log(`\n  review submission ${s.id}: state=${s.attributes.state} submitted=${s.attributes.submittedDate ?? "no"}`);
}
if (!(rs.body.data ?? []).length) console.log("\n  no review submissions in flight");
