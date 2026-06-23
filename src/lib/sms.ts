// SMS delivery. Uses Twilio when TWILIO_* env vars are set; otherwise logs the
// message server-side so code flows are testable in dev / before an SMS provider
// is configured. The code is NEVER returned to the client.
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!SID || !TOKEN || !FROM) {
    console.log(`[sms:dev] To: ${to}\n${body}`);
    return false; // not actually delivered
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: FROM, Body: body }),
    });
    if (!res.ok) {
      console.error("[sms] Twilio error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sms] send failed", e);
    return false;
  }
}

export function signInCodeSms(code: string): string {
  return `Your SETLST sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this message.`;
}
