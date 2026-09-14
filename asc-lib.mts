import { readFileSync } from "node:fs";
import crypto from "node:crypto";
function envOf(f: string, k: string) {
  const m = new RegExp(`^${k}=(?:"([^"]*)"|'([^']*)'|(.*))$`, "m").exec(readFileSync(f, "utf8"));
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}
const B = "/Users/ebaadusmani/reruns/";
const KEY = envOf(B + ".env", "ASC_KEY_ID")!, ISS = envOf(B + ".env", "ASC_ISSUER_ID")!;
const p8 = readFileSync(`${process.env.HOME}/.appstoreconnect/private_keys/AuthKey_${KEY}.p8`, "utf8");
const b64 = (b: string | Buffer) => Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const now = Math.floor(Date.now() / 1000);
const h = b64(JSON.stringify({ alg: "ES256", kid: KEY, typ: "JWT" }));
const pl = b64(JSON.stringify({ iss: ISS, iat: now, exp: now + 900, aud: "appstoreconnect-v1" }));
export const jwt = `${h}.${pl}.${b64(crypto.sign("SHA256", Buffer.from(`${h}.${pl}`), { key: p8, dsaEncoding: "ieee-p1363" }))}`;
export const req = async (m: string, p: string, body?: unknown) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method: m,
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: r.status === 204 ? {} : ((await r.json().catch(() => ({}))) as any) };
};
