import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — SETLST",
  description: "How SETLST collects, uses, and protects your data.",
};

const UPDATED = "June 27, 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
      <Link href="/" className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Privacy Policy</h1>
      <p className="text-xs text-[#6b6b6b] mb-8">Last updated {UPDATED}</p>

      <div className="space-y-6 text-sm text-[#c8c8c8] leading-relaxed">
        <p>
          SETLST (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a music journaling app where you log,
          rate, and discuss the albums you listen to. This policy explains what we collect and how
          we use it. By using SETLST you agree to this policy.
        </p>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><span className="text-[#f0f0f0]">Account details</span> — your username, email address, and (if you choose) a phone number, used to create and secure your account.</li>
            <li><span className="text-[#f0f0f0]">Profile content</span> — your bio and profile picture, if you add them.</li>
            <li><span className="text-[#f0f0f0]">Activity you create</span> — reviews, ratings, crates, discussion posts, replies, comments, likes, follows, and saved albums.</li>
            <li><span className="text-[#f0f0f0]">Technical data</span> — basic information needed to operate the service, such as session and security information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">How we use your information</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To provide the app&apos;s features — saving your reviews, showing your activity, and connecting you with people you follow.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To display your public content (reviews, discussions, profile) to other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">What&apos;s public vs. private</h2>
          <p>
            Your username, profile, reviews, ratings, crates, and discussion activity are visible to
            other users. Your email address and phone number are never shown publicly and are used
            only for account access and recovery.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Sharing &amp; third parties</h2>
          <p>
            We do not sell your personal data. We use trusted service providers to run the app —
            including hosting and our database provider — who process data solely to operate the
            service. Album information is sourced from third-party music catalogs.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Data retention &amp; deletion</h2>
          <p>
            We keep your data while your account is active. You can delete your content at any time
            from within the app. To delete your account and associated data entirely, contact us at
            the email below and we will remove it.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Children</h2>
          <p>SETLST is not directed to children under 13, and we do not knowingly collect their data.</p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Changes</h2>
          <p>We may update this policy from time to time. Material changes will be reflected by the date above.</p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Contact</h2>
          <p>
            Questions about your privacy? Email{" "}
            <a href="mailto:themastersword28@gmail.com" className="text-[#c4a832] hover:underline">themastersword28@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
