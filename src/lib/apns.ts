import http2 from "node:http2";
import crypto from "node:crypto";

// Apple Push Notification service.
//
// APNs speaks HTTP/2 ONLY. Node's global fetch is HTTP/1.1, so a fetch() to
// api.push.apple.com fails at the protocol level however the request is shaped
// — hence node:http2. That also means any route calling this must run on the
// Node runtime, not Edge.
//
// Required env (see docs; the .p8 is created in the Apple Developer portal under
// Certificates, Identifiers & Profiles → Keys, with APNs enabled):
//   APNS_KEY_ID       the key's 10-character id
//   APNS_TEAM_ID      KUDG5M87G9
//   APNS_PRIVATE_KEY  the .p8 file's contents (BEGIN PRIVATE KEY … )
//   APNS_BUNDLE_ID    defaults to app.setlst.native
//   APNS_ENVIRONMENT  "production" for App Store / TestFlight builds

const KEY_ID = process.env.APNS_KEY_ID;
const TEAM_ID = process.env.APNS_TEAM_ID;
const PRIVATE_KEY = process.env.APNS_PRIVATE_KEY;
const BUNDLE_ID = process.env.APNS_BUNDLE_ID ?? "app.setlst.native";

// The app's aps-environment entitlement decides which host will accept its
// tokens: a development build's token is valid ONLY against sandbox, and a
// production build's ONLY against the live host. Sending to the wrong one comes
// back as BadDeviceToken, which looks like a bad token but is a host mismatch.
const HOST =
  process.env.APNS_ENVIRONMENT === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

export function apnsConfigured(): boolean {
  return !!(KEY_ID && TEAM_ID && PRIVATE_KEY);
}

// APNs rejects a provider token older than 1 hour, and also rejects one that is
// regenerated too often — so make it once and reuse it.
let cachedJwt: { value: string; madeAt: number } | null = null;
function providerToken(): string {
  if (cachedJwt && Date.now() - cachedJwt.madeAt < 45 * 60 * 1000) return cachedJwt.value;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64({ alg: "ES256", kid: KEY_ID });
  const payload = b64({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) });
  const signature = crypto
    // Env vars flatten newlines, so restore them before the key is parsed.
    .sign("sha256", Buffer.from(`${header}.${payload}`), {
      key: (PRIVATE_KEY as string).replace(/\\n/g, "\n"),
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");
  cachedJwt = { value: `${header}.${payload}.${signature}`, madeAt: Date.now() };
  return cachedJwt.value;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Merged alongside `aps`; the app reads these on tap. */
  data?: Record<string, string>;
}

export interface PushResult {
  token: string;
  ok: boolean;
  status: number;
  reason?: string;
  /** APNs says this token is dead — delete it rather than retrying. */
  shouldDelete: boolean;
}

function sendOne(
  session: http2.ClientHttp2Session,
  jwt: string,
  token: string,
  message: PushMessage
): Promise<PushResult> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      aps: { alert: { title: message.title, body: message.body }, sound: "default" },
      ...(message.data ?? {}),
    });

    const req = session.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });

    let status = 0;
    let raw = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => { status = Number(headers[":status"] ?? 0); });
    req.on("data", (chunk) => { raw += chunk; });
    req.on("error", (err) =>
      resolve({ token, ok: false, status: 0, reason: err.message, shouldDelete: false })
    );
    req.on("end", () => {
      const reason = raw ? (JSON.parse(raw) as { reason?: string }).reason : undefined;
      resolve({
        token,
        ok: status === 200,
        status,
        reason,
        // 410 Gone = app uninstalled. BadDeviceToken = token isn't valid for
        // this topic/environment. Either way, retrying it forever is pointless.
        shouldDelete: status === 410 || reason === "BadDeviceToken" || reason === "Unregistered",
      });
    });

    req.end(payload);
  });
}

/** Sends one message to many device tokens over a single HTTP/2 connection. */
export async function sendPush(tokens: string[], message: PushMessage): Promise<PushResult[]> {
  if (!apnsConfigured() || tokens.length === 0) return [];
  const jwt = providerToken();
  const session = http2.connect(HOST);
  try {
    // One connection, many streams — that's the point of HTTP/2 here.
    return await Promise.all(tokens.map((t) => sendOne(session, jwt, t, message)));
  } finally {
    session.close();
  }
}
