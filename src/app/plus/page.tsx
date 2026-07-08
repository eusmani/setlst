import Link from "next/link";
import SetlstPlus from "../settings/SetlstPlus";

export const dynamic = "force-dynamic";

export default function PlusPage() {
  return (
    <div className="max-w-lg mx-auto px-5 pt-5 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <div className="mt-3 mb-2 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c4a832]/15 mb-3">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#c4a832"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        </div>
        <h1 className="font-serif text-3xl text-[#f0f0f0]">SETLST Plus</h1>
        <p className="text-sm text-[#a0a0a0] mt-1">Support SETLST and unlock the extras.</p>
      </div>
      <SetlstPlus />
    </div>
  );
}
