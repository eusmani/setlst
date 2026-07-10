import Link from "next/link";

export const metadata = {
  title: "Support — SETLST",
  description: "Get help with SETLST — contact, account, and subscription questions.",
};

const CONTACT = "themastersword28@gmail.com";

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
            You can delete your content from within the app at any time. To permanently delete your
            account and associated data, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            from the address on your account and we&apos;ll remove it.
          </p>
        </Q>

        <Q q="How do I report content or a user?">
          <p>
            SETLST has zero tolerance for objectionable content and abusive behavior. Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#c4a832] hover:underline">{CONTACT}</a>{" "}
            with a link or screenshot and we&apos;ll review it promptly.
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
          <Link href="/privacy" className="text-[#c4a832] hover:underline">Privacy Policy</Link> and{" "}
          <Link href="/terms" className="text-[#c4a832] hover:underline">Terms of Use</Link>.
        </p>
      </div>
    </div>
  );
}
