import Link from "next/link";

export const metadata = {
  title: "Copyright Policy — SETLST",
  description: "How SETLST sources music metadata, and how rights holders can request a takedown.",
};

const UPDATED = "August 4, 2026";

// App Store guideline 5.2.1: an app that displays third-party material has to
// show it is authorised to do so, and give rights holders a real way to object.
export default function CopyrightPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Copyright &amp; Attribution</h1>
      <p className="text-xs text-[#6b6b6b] mb-8">Last updated {UPDATED}</p>

      <div className="space-y-6 text-sm text-[#c8c8c8] leading-relaxed">
        <p>
          SETLST is a place to write about records. It does not host, stream, sell, or distribute
          music. What it shows is catalogue <span className="text-[#f0f0f0]">metadata</span> — album
          titles, artist names, release dates, track listings, and cover artwork — used to identify
          the release a member is reviewing or discussing.
        </p>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Where our music data comes from</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-[#f0f0f0]">Apple Music / iTunes Search API</span> — album,
              artist, and release metadata and cover artwork, used under the Apple Media Services
              terms and the iTunes affiliate/search guidelines.
            </li>
            <li>
              <span className="text-[#f0f0f0]">Spotify Web API</span> — album and artist metadata,
              artwork, and, if you connect your own account, your listening history. Used under the
              Spotify Developer Terms of Service.
            </li>
            <li>
              <span className="text-[#f0f0f0]">MusicBrainz</span> — genre, release, and credit data,
              used under its open data licence (CC0 / CC BY-NC-SA as applicable).
            </li>
            <li>
              <span className="text-[#f0f0f0]">Wikipedia</span> — background text about albums and
              artists, used under CC BY-SA with attribution.
            </li>
            <li>
              <span className="text-[#f0f0f0]">SeatGeek</span> — concert and event listings, used
              under the SeatGeek Platform terms.
            </li>
          </ul>
          <p className="mt-2">
            Artwork is displayed at catalogue resolution to identify a release, alongside links back
            to the rights holder&apos;s own service. We claim no ownership of any of it, and it is
            not used to promote SETLST itself.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Member-written content</h2>
          <p>
            Reviews, discussions, comments, and photos on SETLST are written and uploaded by our
            members, who confirm when they post that they have the right to share what they post.
            We remove infringing material when we learn of it.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Trademarks</h2>
          <p>
            Apple, Apple Music, and the App Store are trademarks of Apple Inc. Spotify is a
            trademark of Spotify AB. Instagram is a trademark of Meta Platforms, Inc. SeatGeek is a
            trademark of SeatGeek, Inc. Artist, band, and label names and logos belong to their
            respective owners. SETLST is an independent app and is not affiliated with, sponsored
            by, or endorsed by any of them; these names are used only to describe where information
            comes from or where a link goes.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Requesting a takedown</h2>
          <p className="mb-2">
            If you own the rights to something on SETLST and believe it is being used without
            authorisation, email{" "}
            <a href="mailto:copyright@setlst.dev" className="text-[#c4a832] hover:underline">copyright@setlst.dev</a>{" "}
            with:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Identification of the work you say is infringed.</li>
            <li>A link to the exact page or post in SETLST where it appears.</li>
            <li>Your name, address, phone number, and email.</li>
            <li>A statement that you believe in good faith the use is not authorised by you, your agent, or the law.</li>
            <li>A statement, under penalty of perjury, that your notice is accurate and that you are the rights holder or authorised to act for them.</li>
            <li>Your physical or electronic signature.</li>
          </ul>
          <p className="mt-2">
            We review copyright notices and remove or disable access to infringing material{" "}
            <span className="text-[#f0f0f0]">within 24 hours</span>, and we terminate the accounts of
            repeat infringers. Members can also flag infringing posts in the app: use the{" "}
            <span className="text-[#f0f0f0]">···</span> menu on any post and choose{" "}
            <span className="text-[#f0f0f0]">Copyright or trademark infringement</span>.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Counter-notice</h2>
          <p>
            If your content was removed and you believe that was a mistake or misidentification, you
            can send a counter-notice to the same address, including your contact details, the
            material removed and where it appeared, and a statement under penalty of perjury that
            you believe it was removed in error.
          </p>
        </section>

        <section>
          <h2 className="text-[#f0f0f0] font-semibold mb-2">Contact</h2>
          <p>
            Copyright and trademark:{" "}
            <a href="mailto:copyright@setlst.dev" className="text-[#c4a832] hover:underline">copyright@setlst.dev</a>
            . Everything else:{" "}
            <a href="mailto:support@setlst.dev" className="text-[#c4a832] hover:underline">support@setlst.dev</a>.
            See also our{" "}
            <Link href="/terms" className="text-[#c4a832] hover:underline">Terms of Use</Link> and{" "}
            <Link href="/privacy" className="text-[#c4a832] hover:underline">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
