import Link from "next/link";

// The shortcut grid at the top of the mobile home, in the shape Spotify and
// DICE both use: a few large, thumb-sized targets for the things people open the
// app to do, above any browsable content.
//
// Deliberately four and no more — the value of this pattern is that it's
// scannable in one glance, and a fifth row turns it back into a menu.
type IconName = "plus" | "book" | "stack" | "bell";

interface Tile {
  href: string;
  label: string;
  icon: IconName;
  /** The primary action gets the filled treatment; the rest are quiet. */
  accent?: boolean;
}

const TILES: Tile[] = [
  { href: "/log", label: "Log an album", icon: "plus", accent: true },
  // Opens the activity screen locked to your own history — `only=you` hides the
  // Friends / Trending switcher, so this is your diary and nothing else. Those
  // two live behind the bottom bar's Activity item, which opens bare /activity.
  // Deliberately NOT /diary: despite that route's name it's the music-news
  // reader (the navbar calls it "News").
  { href: "/activity?tab=you&only=you", label: "Your diary", icon: "book" },
  { href: "/crate", label: "Crates", icon: "stack" },
  // Notifications, not a link to the members list: this is the tile people
  // check, and there was nowhere else in the app showing things aimed at you.
  { href: "/notifications", label: "Notifications", icon: "bell" },
];

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "plus":
      return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    case "stack":
      return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
  }
}

export default function QuickTiles() {
  return (
    <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-2">
      {TILES.map(({ href, label, icon, accent }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-3 min-h-[56px] transition-colors ${
            accent
              ? "bg-[#c4a832] text-[#141414] hover:bg-[#d4ba44]"
              : "bg-[#1a1a1a] border border-[#232323] text-[#e8e8e8] hover:border-[#3a3a3a]"
          }`}
        >
          <span className={accent ? "text-[#141414]" : "text-[#c4a832]"}>
            <Icon name={icon} />
          </span>
          <span className="text-[13px] font-semibold leading-tight">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
