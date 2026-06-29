import Link from "next/link";

export const metadata = {
  title: "Get SETLST on your phone — SETLST",
  description: "Install the SETLST mobile app.",
};

export default function DownloadPage() {
  return (
    <div className="max-w-xl mx-auto px-5 pt-10 pb-16 text-center">
      <img src="/turntable-logo.png" alt="" className="w-16 h-16 mx-auto mb-4 object-contain" />
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-2">Get SETLST on your phone</h1>
      <p className="text-sm text-[#a0a0a0] mb-8">
        Log, rate, and discuss albums on the go — same account, everywhere.
      </p>

      {/* App Store — listing pending review */}
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#f0f0f0">
            <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.74-1.517.03-2.01-.88-3.71-.88-1.71 0-2.25.85-3.69.91-1.42.05-2.5-1.45-3.46-2.78-1.96-2.75-3.49-7.78-1.46-11.18 1.01-1.68 2.83-2.75 4.79-2.78 1.46-.03 2.83.96 3.71.96.88 0 2.55-1.19 4.31-1.01.73.03 2.79.29 4.11 2.22-.11.07-2.46 1.42-2.43 4.24.03 3.37 2.97 4.49 3 4.5z" />
          </svg>
          <span className="text-sm text-[#f0f0f0] font-semibold">iOS App</span>
        </div>
        <p className="text-xs text-[#6b6b6b]">Coming soon to the App Store — review pending.</p>
      </div>

      {/* Add to Home Screen — works right now */}
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-6 text-left">
        <p className="text-sm text-[#f0f0f0] font-semibold mb-3">Install it now (no App Store needed)</p>
        <ol className="space-y-2 text-sm text-[#a0a0a0] list-decimal pl-5">
          <li>Open <span className="text-[#f0f0f0]">reruns.vercel.app</span> in Safari on your iPhone.</li>
          <li>Tap the <span className="text-[#f0f0f0]">Share</span> button (the square with an up arrow).</li>
          <li>Choose <span className="text-[#f0f0f0]">Add to Home Screen</span>.</li>
          <li>Tap <span className="text-[#f0f0f0]">Add</span> — SETLST now opens full-screen like a native app.</li>
        </ol>
      </div>

      <Link href="/" className="inline-block mt-8 text-xs text-[#c4a832] hover:underline">← Back home</Link>
    </div>
  );
}
