import { req } from "./asc-lib.mts";
const GROUP = "22219011", SUB = "6788966783";
const PRICE_POINT = "eyJzIjoiNjc4ODk2Njc4MyIsInQiOiJVU0EiLCJwIjoiMTAwMzYifQ"; // USA $2.99

const show = (label: string, r: any) =>
  console.log(`${r.status < 300 ? "OK  " : "FAIL"} ${label}  [${r.status}] ${r.status < 300 ? "" : JSON.stringify(r.body.errors?.map((e: any) => e.detail ?? e.title))}`);

// 1. Customer-facing name for the subscription GROUP.
show("group localization", await req("POST", "/v1/subscriptionGroupLocalizations", {
  data: { type: "subscriptionGroupLocalizations",
    attributes: { locale: "en-US", name: "SETLST Pro" },
    relationships: { subscriptionGroup: { data: { type: "subscriptionGroups", id: GROUP } } } },
}));

// 2. Display name + description shown on the App Store purchase sheet.
show("subscription localization", await req("POST", "/v1/subscriptionLocalizations", {
  data: { type: "subscriptionLocalizations",
    attributes: { locale: "en-US", name: "SETLST Pro", description: "Ad-free, analytics, recaps & more" },
    relationships: { subscription: { data: { type: "subscriptions", id: SUB } } } },
}));

// 3. Price — USA $2.99/month.
show("price (USA $2.99)", await req("POST", "/v1/subscriptionPrices", {
  data: { type: "subscriptionPrices",
    attributes: { preserveCurrentPrice: false },
    relationships: {
      subscription: { data: { type: "subscriptions", id: SUB } },
      subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: PRICE_POINT } } } },
}));

// 4. Re-read state.
const s = (await req("GET", `/v1/subscriptions/${SUB}`)).body.data;
console.log(`\nstate now: ${s.attributes.state}`);
const prices = (await req("GET", `/v1/subscriptions/${SUB}/prices?limit=200&include=territory`)).body;
console.log(`territories priced: ${(prices.data ?? []).length}`);
