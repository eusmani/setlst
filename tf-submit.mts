import { req } from "./asc-lib.mts";

const app = (await req("GET", "/v1/apps?limit=1")).body.data[0];

// 1. Point the beta demo credentials at the seeded account, which actually has
//    content to report and block. The previous value named a different account.
const detail = (await req("GET", `/v1/apps/${app.id}/betaAppReviewDetail`)).body.data;
const patch = await req("PATCH", `/v1/betaAppReviewDetails/${detail.id}`, {
  data: {
    type: "betaAppReviewDetails",
    id: detail.id,
    attributes: {
      demoAccountName: "setlst_demo",
      demoAccountPassword: "SetlstDemo!2026",
      demoAccountRequired: true,
      contactEmail: "support@setlst.dev",
      notes:
        "Sign in with the demo account above. Reporting and blocking: every review, " +
        "discussion, reply, direct message and profile has a ··· menu offering Report " +
        "(nine reasons) and Block. The demo account follows three other members and " +
        "appears in a discussion and a conversation it did not start, so both flows can " +
        "be exercised immediately — the menu is hidden on your own content. Blocked " +
        "accounts are managed in Settings → Block list.",
    },
  },
});
console.log(`  demo credentials -> setlst_demo   HTTP ${patch.status}${patch.status >= 300 ? " " + JSON.stringify(patch.body).slice(0, 200) : ""}`);

// 2. Submit the newest build for Beta App Review.
const build = (await req("GET", `/v1/builds?filter[app]=${app.id}&limit=1&sort=-uploadedDate`)).body.data[0];
const sub = await req("POST", "/v1/betaAppReviewSubmissions", {
  data: { type: "betaAppReviewSubmissions", relationships: { build: { data: { type: "builds", id: build.id } } } },
});
console.log(`  submit build ${build.attributes.version} for Beta App Review   HTTP ${sub.status}`);
if (sub.status >= 300) console.log("    " + JSON.stringify(sub.body).slice(0, 300));
else console.log(`    state: ${sub.body.data?.attributes?.betaReviewState}`);
