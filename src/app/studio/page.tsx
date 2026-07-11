import Link from "next/link";

export const metadata = {
  title: "SETLST — Track, rate & discuss the music you love",
  description:
    "SETLST is your all-in-one music database and review hub. Log every album you listen to, rate your favorites, explore full discographies, join discussions, and discover your next favorite artist.",
};

const FEATURES: { title: string; body: string }[] = [
  { title: "Log & rate", body: "Keep a running diary of every album you listen to and rate your favorites out of five." },
  { title: "Reviews & discussions", body: "Write reviews, start threads on any album, and reply back and forth with people who share your taste." },
  { title: "Discover", body: "Popular This Week, Grails, and Release Radar surface new releases and hidden gems across every genre." },
  { title: "Follow friends", body: "Build crates, follow friends, and see what the people you trust are spinning in real time." },
  { title: "Concerts", body: "Find shows near you based on the artists you actually listen to." },
  { title: "SETLST Pro", body: "Go ad-free and unlock review analytics, monthly recaps, your personal Diary timeline, and more." },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 pt-10 pb-20">
      {/* Hero */}
      <div className="text-center">
        <img src="/turntable-logo.png" alt="SETLST" className="pro-turntable w-20 h-20 mx-auto mb-5 object-contain" />
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#f0f0f0] leading-tight">
          Track, rate &amp; discuss<br />
          <span className="text-[#c4a832]">the music you love.</span>
        </h1>
        <p className="text-[#a0a0a0] text-base max-w-xl mx-auto mt-5 leading-relaxed">
          SETLST is your all-in-one music database and review hub. Log every album you listen to,
          rate your favorites, explore complete discographies, join the conversation, and discover
          the next new artist in your rotation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link href="/download" className="bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] px-6 py-3 rounded-lg text-sm font-semibold transition-colors">
            Get the app
          </Link>
          <Link href="/" className="border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#f0f0f0] px-6 py-3 rounded-lg text-sm transition-colors">
            Explore SETLST
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold mb-1.5">{f.title}</h2>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>

      {/* Closing CTA */}
      <div className="text-center mt-16">
        <h3 className="font-serif text-2xl text-[#f0f0f0] mb-3">Your record collection, reimagined.</h3>
        <Link href="/register" className="inline-block bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] px-6 py-3 rounded-lg text-sm font-semibold transition-colors">
          Create your free account
        </Link>
        <p className="text-xs text-[#6b6b6b] mt-8">
          <Link href="/privacy" className="hover:text-[#c4a832] transition-colors">Privacy</Link>
          <span className="mx-2 text-[#2e2e2e]">·</span>
          <Link href="/terms" className="hover:text-[#c4a832] transition-colors">Terms</Link>
          <span className="mx-2 text-[#2e2e2e]">·</span>
          <Link href="/support" className="hover:text-[#c4a832] transition-colors">Support</Link>
        </p>
      </div>
    </div>
  );
}
