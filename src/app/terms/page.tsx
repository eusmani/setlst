import Link from "next/link";

export const metadata = {
  title: "Terms of Use — SETLST",
  description: "The terms and conditions for using SETLST.",
};

const UPDATED = "August 4, 2026";

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
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Agreement to these terms</h2>
          <p>
            These Terms of Use are the end-user licence agreement between you and SETLST. You accept
            them when you create an account, and we record which version you accepted. If we change
            them materially, we&rsquo;ll ask you to accept the new version.
          </p>
        </section>

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
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Acceptable use &mdash; zero tolerance</h2>
          <p className="mb-2">
            <span className="text-[#f0f0f0]">
              SETLST has zero tolerance for objectionable content and abusive behaviour.
            </span>{" "}
            You agree not to post, send, or link to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Hate speech, slurs, or content attacking people based on race, ethnicity, national origin, religion, disability, sex, gender identity, or sexual orientation.</li>
            <li>Harassment, bullying, stalking, or threats against anyone.</li>
            <li>Sexually explicit or pornographic material, and&mdash;absolutely&mdash;any content that sexualises minors.</li>
            <li>Content encouraging violence, self-harm, or suicide.</li>
            <li>Unlawful content, or content that infringes anyone&rsquo;s copyright, trademark, or privacy.</li>
            <li>Impersonation of another person, artist, or organisation.</li>
            <li>Spam, scams, malware, or attempts to disrupt or reverse-engineer the service.</li>
            <li>Images or media you do not have the right to share.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Reporting, blocking, and moderation</h2>
          <p className="mb-2">
            Every review, discussion, reply, message, and profile in SETLST has a{" "}
            <span className="text-[#f0f0f0]">···</span> menu with{" "}
            <span className="text-[#f0f0f0]">Report</span> and{" "}
            <span className="text-[#f0f0f0]">Block</span>. Blocking someone stops them from
            messaging you, following you, or replying to you, and hides you from each other
            everywhere in the app. You can manage blocked accounts in Settings.
          </p>
          <p className="mb-2">
            We commit to reviewing every report and{" "}
            <span className="text-[#f0f0f0]">removing offending content within 24 hours</span>,
            and to ejecting the users who posted it. Posts are also screened automatically as they
            are submitted, and content matching our prohibited categories is rejected before it is
            ever published.
          </p>
          <p>
            We may remove content and suspend or permanently terminate accounts that violate these
            terms, with or without notice. To report something outside the app, or to appeal a
            suspension, email{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>.
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
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Our content</h2>
          <p>
            SETLST — the app, its source code, design, and the SETLST name and logo — is owned by
            Ebaad Usmani and protected by copyright and trademark law. Using the service gives you
            a personal, non-transferable right to use it as intended; it does not transfer any
            ownership. You may not copy, modify, reverse-engineer, or redistribute any part of
            SETLST without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Third-party music content</h2>
          <p className="mb-2">
            Album titles, artist names, release dates, cover artwork, and preview clips are supplied
            by third-party catalogue APIs &mdash; Apple Music, Spotify, MusicBrainz, and Wikipedia
            &mdash; and are used under the terms of each provider&rsquo;s public developer
            programme. That material remains the property of its respective rights holders: the
            artists, labels, and publishers who own it.
          </p>
          <p className="mb-2">
            SETLST does not host, stream, or sell music. Cover artwork is displayed at catalogue
            scale purely to identify the release being discussed, links point back to the rights
            holder&rsquo;s own service, and we do not claim ownership of any of it.
          </p>
          <p>
            SETLST is an independent app. It is not affiliated with, sponsored by, or endorsed by
            Apple, Spotify, MusicBrainz, SeatGeek, or any artist or label whose work appears in the
            catalogue. All trademarks belong to their owners. If you are a rights holder and want
            something removed, see our{" "}
            <Link href="/copyright" className="text-[#c4a832] hover:underline">Copyright policy</Link>.
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
