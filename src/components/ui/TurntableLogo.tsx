// Line-art turntable mark used beside the SETLST wordmark. Inherits the current
// text color via `currentColor`, so it matches the brand link (and its hover).
export default function TurntableLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* case */}
      <rect x="3" y="3" width="42" height="42" rx="4.5" />
      {/* record / platter + grooves */}
      <circle cx="20" cy="25" r="15" />
      <circle cx="20" cy="25" r="11" />
      <circle cx="20" cy="25" r="4.5" />
      <circle cx="20" cy="25" r="1.1" fill="currentColor" stroke="none" />
      {/* tonearm: pivot/counterweight, arm, headshell */}
      <circle cx="37" cy="12.5" r="4" />
      <line x1="35.4" y1="15.2" x2="24.6" y2="32" />
      <line x1="24.6" y1="32" x2="22.2" y2="34.6" />
      {/* start/stop button */}
      <rect x="34" y="35.5" width="7.5" height="7.5" rx="1.3" />
    </svg>
  );
}
