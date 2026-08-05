import Link from "next/link";

export const metadata = {
  title: "Support — SETLST",
  description: "Get help with SETLST — contact, account, and subscription questions.",
};

const CONTACT = "support@setlst.dev";

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[#f0f0f0] font-semibold mb-2">{q}</h2>
      <div className="text-[#c8c8c8]">{children}</div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Support</h1>
      <p className="text-xs text-[#6b6b6b] mb-8">We&apos;re here to help.</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <div className="rounded-xl p-5 border border-[#c4a832]/40 bg-gradient-to-br from-[#c4a832]/12 to-[#1a1a1a]">
          <p className="text-[#f0f0f0] font-semibold mb-1">Contact us</p>
          <p className="text-[#c8c8c8]">
            Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            and we&apos;ll get back to you as soon as we can (usually within a few days).
          </p>
        </div>

        <Q q="How do I reset my password?">
          <p>
            Use the sign-in screen&apos;s password reset option, or email us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            and we&apos;ll help you regain access.
          </p>
        </Q>

        <Q q="How do I manage or cancel SETLST Pro?">
          <p>
            SETLST Pro is an auto-renewing subscription billed through your Apple ID. To view, change,
            or cancel it, open the <span className="text-[#f0f0f0]">Settings app</span> on your iPhone
            → tap your name → <span className="text-[#f0f0f0]">Subscriptions</span> → SETLST. You can
            also restore a previous purchase from the SETLST Pro screen in the app.
          </p>
        </Q>

        <Q q="How do I delete my account?">
          <p>
            Go to{" "}
            <Link href="/settings/delete" className="text-[#c4a832] hover:underline">
              Settings → Delete account
            </Link>{" "}
            and confirm. That permanently removes your profile, reviews, ratings, comments,
            discussions, crates, messages, and follows &mdash; immediately, and for good. You can
            also delete individual posts at any time. If you&apos;d rather we did it, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            from the address on your account.
          </p>
        </Q>

        <Q q="How do I report content or a user?">
          <p className="mb-2">
            SETLST has zero tolerance for objectionable content and abusive behaviour. Tap the{" "}
            <span className="text-[#f0f0f0]">···</span> menu on any review, discussion, reply,
            message, or profile and choose <span className="text-[#f0f0f0]">Report</span>. Pick a
            reason and send &mdash; that&apos;s it.
          </p>
          <p>
            Every report is reviewed and offending content is removed{" "}
            <span className="text-[#f0f0f0]">within 24 hours</span>, along with the accounts
            responsible. If you can&apos;t use the in-app flow, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            with a link or screenshot.
          </p>
        </Q>

        <Q q="How do I block someone?">
          <p>
            Use the same <span className="text-[#f0f0f0]">···</span> menu and choose{" "}
            <span className="text-[#f0f0f0]">Block</span>, or add them by username under{" "}
            <span className="text-[#f0f0f0]">Settings → Blocked accounts</span>. Blocked people
            can&apos;t message you, follow you, or reply to you, and you won&apos;t see each other
            anywhere in the app. Unblock from the same place whenever you like.
          </p>
        </Q>

        <Q q="My account was suspended — can I appeal?">
          <p>
            Yes. Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            from the address on your account and we&apos;ll take another look. You can still sign in
            to a suspended account to export or delete your data.
          </p>
        </Q>

        <Q q="I'm a rights holder and want something taken down">
          <p>
            See our{" "}
            <Link href="/copyright" className="text-[#c4a832] hover:underline">Copyright policy</Link>{" "}
            for what to include, and email{" "}
            <a href="mailto:copyright@setlst.dev" className="text-[#c4a832] hover:underline">copyright@setlst.dev</a>.
            Infringing material is removed within 24 hours.
          </p>
        </Q>

        <Q q="Make my account private">
          <p>
            You can switch your profile between public and private anytime in{" "}
            <span className="text-[#f0f0f0]">Settings</span>. Private accounts only share their
            activity with followers you approve.
          </p>
        </Q>

        <p className="text-[#6b6b6b] pt-2">
          See also our{" "}
          <Link href="/privacy" className="text-[#c4a832] hover:underline">Privacy Policy</Link>,{" "}
          <Link href="/terms" className="text-[#c4a832] hover:underline">Terms of Use</Link>, and{" "}
          <Link href="/copyright" className="text-[#c4a832] hover:underline">Copyright policy</Link>.
        </p>
      </div>
    </div>
  );
}
