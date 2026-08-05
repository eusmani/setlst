import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — SETLST",
  description: "What SETLST collects, why, who it's shared with, and how to delete it.",
};

const UPDATED = "August 4, 2026";

// This policy has to be complete and accurate, not just present: App Store
// guidelines 5.1.1 and 5.1.2 require disclosing every category of data
// collected, the purpose of each, every third party it's shared with, and a
// working way to delete an account and its data from inside the app.
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Privacy Policy</h1>
      <p className="text-xs text-[#6b6b6b] mb-8">Last updated {UPDATED}</p>

      <div className="space-y-6 text-sm text-[#c8c8c8] leading-relaxed">
        <p>
          SETLST (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a music journaling app where you log,
          rate, and discuss the albums you listen to. It is operated by Ebaad Usmani. This policy
          explains exactly what we collect, why we collect it, who it goes to, and how to get rid
          of it. We do not sell your personal data, and we do not use it for advertising or
          tracking across other companies&apos; apps and websites.
        </p>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">What we collect and why</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="text-[#f0f0f0]">Account details</span> — a username, an email
              address, and a password (stored only as a bcrypt hash). Used to create your account,
              sign you in, and recover access. Required to have an account.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Phone number</span> — <span className="text-[#f0f0f0]">optional</span>.
              If you add one, it is used for account recovery and so people who already have your
              number can find you. You can use SETLST without ever providing one, and you can
              remove it at any time in Settings.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Profile content</span> — your display name, bio, and
              profile picture, if you add them. Public.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Activity you create</span> — reviews, ratings, crates,
              discussion posts, replies, comments, likes, votes, follows, saved albums, and concert
              attendance. This is the content the app exists to store. Public, except as noted below.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Direct messages</span> — the messages you send other
              members, so they can be delivered and shown in your inbox. Private between you and
              the recipient; we access them only when one of you reports a message.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Location</span> — <span className="text-[#f0f0f0]">optional</span>,
              and only when you tap to find concerts near you. Your coordinates are sent to our
              concert search and to OpenStreetMap to turn them into a city name. They are used for
              that search and are never stored on our servers or linked to your account.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Contacts</span> — the iOS app never accesses your
              address book. On platforms that support the browser Contact Picker, you can choose
              specific contacts to check against SETLST. Those numbers are hashed on your device
              and only the hashes are sent; we compare them in memory, return the matches, and
              store nothing — not the hashes, and nothing at all about contacts who aren&apos;t
              members. See &ldquo;Finding friends&rdquo; below.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Push notification token</span> — if you allow
              notifications, so we can send you the alerts you enabled. Nothing else.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Spotify account link</span> — <span className="text-[#f0f0f0]">optional</span>.
              If you connect Spotify, we store access tokens so we can read your listening history
              to recommend albums and concerts. Disconnect at any time in Settings; the tokens are
              deleted when you do.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Subscription status</span> — if you buy SETLST Pro,
              we store which plan you have and when it renews. Apple handles the payment; we never
              see your card details.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Technical data</span> — session cookies, and IP
              addresses used transiently for rate limiting and abuse prevention. We do not build
              advertising profiles and we do not use third-party analytics SDKs that track you
              across other apps.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Moderation records</span> — if you report content or
              are reported, we keep the report, a copy of the reported content, and the outcome, so
              we can enforce our rules and handle repeat offenders.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Finding friends</h2>
          <p>
            Contact matching is opt-in and happens only when you start it. Your device normalizes
            each number and hashes it with SHA-256 before anything is sent, so we never receive the
            phone numbers in your address book. We compare the hashes against members who chose to
            add their own number, return those matches to you, and discard everything else
            immediately. We never message your contacts, never invite them on your behalf, and
            never use this data for anything other than showing you which of your contacts are
            already on SETLST.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">What&apos;s public vs. private</h2>
          <p>
            Your username, profile, reviews, ratings, crates, and discussion activity are visible to
            other users — that is the point of the app. Setting your account to private limits your
            content to followers you approve. Your email address, phone number, password, location,
            and direct messages are never shown publicly.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Who we share data with</h2>
          <p className="mb-2">
            We do not sell your data or share it with data brokers. We share the minimum necessary
            with the following service providers, who process it only to operate SETLST:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><span className="text-[#f0f0f0]">Vercel</span> — hosting and delivery of the app.</li>
            <li><span className="text-[#f0f0f0]">Turso</span> — the database your account and content are stored in.</li>
            <li><span className="text-[#f0f0f0]">Resend</span> — sending verification, sign-in, and password-reset emails.</li>
            <li><span className="text-[#f0f0f0]">Twilio</span> — sending sign-in codes by SMS, if you use a phone number.</li>
            <li><span className="text-[#f0f0f0]">Apple</span> — App Store purchases, and delivery of push notifications.</li>
            <li><span className="text-[#f0f0f0]">RevenueCat</span> — managing SETLST Pro subscription status.</li>
            <li><span className="text-[#f0f0f0]">Spotify</span> — only if you connect your account, to read your listening history.</li>
            <li><span className="text-[#f0f0f0]">SeatGeek</span> — concert listings; receives coordinates or a city when you search for shows.</li>
            <li><span className="text-[#f0f0f0]">OpenStreetMap (Nominatim)</span> — turning coordinates into a city name.</li>
            <li>
              <span className="text-[#f0f0f0]">Apple Music, MusicBrainz, and Wikipedia</span> —
              album, artist, and release information. These receive search terms, not your identity.
            </li>
          </ul>
          <p className="mt-2">
            We may also disclose information if we are legally required to, or where it is necessary
            to investigate a credible threat to someone&apos;s safety.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Deleting your account and data</h2>
          <p>
            You can delete individual reviews, posts, and messages at any time. You can permanently
            delete your entire account from inside the app:{" "}
            <Link href="/settings/delete" className="text-[#c4a832] hover:underline">
              Settings → Delete account
            </Link>. That removes your profile, reviews, ratings, comments, discussions, crates,
            messages, follows, and any phone number or Spotify tokens on your account. It takes
            effect immediately and cannot be undone. We retain moderation records where we are
            required to for safety and legal reasons, and backups roll off within 30 days. If you
            would rather we do it for you, email{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Data retention</h2>
          <p>
            We keep your account data for as long as your account exists. Rate-limiting records are
            transient and expire within minutes. Contact-matching hashes are never written to disk.
            Reports and their evidence are kept for as long as needed to enforce our rules.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Your rights</h2>
          <p>
            You can access and correct your information in Settings, delete your account in the app,
            and ask us for a copy of your data. Depending on where you live (for example the EEA,
            UK, or California) you may also have the right to object to or restrict certain
            processing, and to lodge a complaint with your data protection authority. Email{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>{" "}
            and we will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Children</h2>
          <p>
            SETLST is not directed to children under 13, and we do not knowingly collect their
            personal information. If you believe a child under 13 has created an account, email us
            and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Security</h2>
          <p>
            Passwords are stored hashed with bcrypt, traffic is encrypted in transit, and access to
            production data is limited. No service can promise perfect security, but we will notify
            affected users promptly if a breach puts their data at risk.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Changes</h2>
          <p>
            We may update this policy. Material changes will be reflected by the date above and, for
            significant changes, surfaced in the app.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Contact</h2>
          <p>
            Questions about your privacy, or want your data deleted? Email{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>.
            See also our{" "}
            <Link href="/terms" className="text-[#c4a832] hover:underline">Terms of Use</Link> and{" "}
            <Link href="/copyright" className="text-[#c4a832] hover:underline">Copyright policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
