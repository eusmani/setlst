import Link from "next/link";
import SetlstPlus from "../settings/SetlstPlus";

export const dynamic = "force-dynamic";

export default function PlusPage() {
  return (
    <div className="max-w-lg mx-auto px-5 pt-5 pb-16">
      <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Home</Link>
      <div className="mt-3 mb-2 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c4a832]/15 mb-3">
          <img src="/turntable-logo.png" alt="SETLST" className="w-11 h-11 object-contain" />
        </div>
        <h1 className="font-serif text-3xl text-[#f0f0f0]">SETLST Pro</h1>
        <p className="text-sm text-[#a0a0a0] mt-1">Support SETLST and unlock the extras.</p>
      </div>
      <SetlstPlus />
    </div>
  );
}
