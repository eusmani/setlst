import Link from "next/link";

export const metadata = {
  title: "Terms of Use — SETLST",
  description: "The terms and conditions for using SETLST.",
};

const UPDATED = "July 10, 2026";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Terms of Use</h1>
      <p className="text-xs text-[#6b6b6b] mb-8">Last updated {UPDATED}</p>

      <div className="space-y-6 text-sm text-[#c8c8c8] leading-relaxed">
        <p>
          Welcome to SETLST (&ldquo;SETLST,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;), a music
          journaling app where you log, rate, and discuss the albums you listen to. By creating an
          account or using the app you agree to these Terms of Use and to our{" "}
          <Link href="/privacy" className="text-[#c4a832] hover:underline">Privacy Policy</Link>. If
          you do not agree, please do not use SETLST.
        </p>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Eligibility</h2>
          <p>
            You must be at least 13 years old to use SETLST. By using the app you represent that you
            meet this requirement and that the information you provide is accurate.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Your account</h2>
          <p>
            You are responsible for keeping your login credentials secure and for all activity that
            happens under your account. Notify us promptly if you believe your account has been
            compromised.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Your content</h2>
          <p>
            You own the reviews, ratings, crates, discussions, comments, and other content you
            create. By posting it on SETLST you grant us a non-exclusive license to host, display,
            and distribute that content within the app so the service can function. You are
            responsible for the content you post and confirm you have the right to share it.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Acceptable use</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Post unlawful, hateful, harassing, or infringing content, or content that is not safe for work.</li>
            <li>Impersonate others or misrepresent your affiliation with any person or entity.</li>
            <li>Abuse, spam, or attempt to disrupt or reverse-engineer the service.</li>
            <li>Upload images or media you do not have the right to share.</li>
          </ul>
          <p className="mt-2">
            There is zero tolerance for objectionable content or abusive behavior. We may remove
            content and suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">SETLST Pro subscription</h2>
          <p>
            SETLST Pro is an optional auto-renewing subscription that unlocks premium features.
            Payment is charged to your Apple ID at confirmation of purchase. Subscriptions renew
            automatically unless auto-renew is turned off at least 24 hours before the end of the
            current period, and your account is charged for renewal within 24 hours of the end of
            the period. You can manage or cancel your subscription in your device&apos;s App Store
            account settings. Except where required by law, payments are non-refundable and are
            handled by Apple under its terms.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Third-party content</h2>
          <p>
            Album, artist, and release information is sourced from third-party music catalogs and
            belongs to their respective owners. SETLST is not affiliated with or endorsed by those
            providers.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Disclaimer &amp; limitation of liability</h2>
          <p>
            SETLST is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest
            extent permitted by law, we are not liable for any indirect, incidental, or
            consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Termination</h2>
          <p>
            You may stop using SETLST and delete your account at any time. We may suspend or
            terminate access if you violate these terms or use the service in a way that could harm
            SETLST or its users.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Changes</h2>
          <p>We may update these terms from time to time. Material changes will be reflected by the date above.</p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
