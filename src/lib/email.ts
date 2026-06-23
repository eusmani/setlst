// Email delivery. Uses Resend when RESEND_API_KEY is set; otherwise logs the
// message server-side so flows are testable in dev / before an email provider
// is configured. The reset link is NEVER returned to the client.
const FROM = process.env.EMAIL_FROM || "SETLST <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n${html}`);
    return false; // not actually delivered
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

export function verifyEmailHtml(username: string, link: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c160c">
      <h2>Verify your SETLST email</h2>
      <p>Hi ${username}, confirm your email address to finish setting up your account.</p>
      <p><a href="${link}" style="display:inline-block;background:#c4a832;color:#111;padding:10px 18px;border-radius:8px;text-decoration:none">Verify email</a></p>
      <p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn't create a SETLST account, you can ignore this email.</p>
      <p style="color:#999;font-size:12px">${link}</p>
    </div>`;
}

export function welcomeHtml(username: string, appUrl: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c160c">
      <h2>Welcome to SETLST, ${username} 🎶</h2>
      <p>Your account is ready. Start logging the albums you love, rate your favorites, and follow friends to see what they're listening to.</p>
      <p><a href="${appUrl}" style="display:inline-block;background:#c4a832;color:#111;padding:10px 18px;border-radius:8px;text-decoration:none">Open SETLST</a></p>
      <p style="color:#666;font-size:13px">Log a few albums to kick off your diary and shape Popular This Week.</p>
    </div>`;
}

export function signInCodeHtml(username: string, code: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c160c">
      <h2>Your SETLST sign-in code</h2>
      <p>Hi ${username}, use this code to sign in and get back into your account.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f5efdf;border-radius:8px;padding:14px 0;text-align:center;color:#111">${code}</p>
      <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>`;
}

export function usernameReminderHtml(username: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c160c">
      <h2>Your SETLST username</h2>
      <p>You asked us to remind you which account is tied to this email. Your username is:</p>
      <p style="font-size:22px;font-weight:700;color:#111">${username}</p>
      <p style="color:#666;font-size:13px">You can sign in with this username or this email address. If you didn't request this, you can ignore this email.</p>
    </div>`;
}

export function passwordResetHtml(username: string, link: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1c160c">
      <h2>Reset your SETLST password</h2>
      <p>Hi ${username}, we received a request to reset your password.</p>
      <p><a href="${link}" style="display:inline-block;background:#c4a832;color:#111;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
      <p style="color:#666;font-size:13px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <p style="color:#999;font-size:12px">${link}</p>
    </div>`;
}
