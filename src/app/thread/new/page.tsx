import { auth } from "@/lib/auth";
import Link from "next/link";
import NewThread from "./NewThread";

export const dynamic = "force-dynamic";

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; title?: string; artist?: string; artwork?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">Sign in to start a discussion.</p>
        <Link href="/login" className="text-xs text-[#c4a832] hover:underline">Sign in →</Link>
      </div>
    );
  }
  if (!sp.album || !sp.title || !sp.artist) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">Pick an album to discuss first.</p>
        <Link href="/search" className="text-xs text-[#c4a832] hover:underline">Browse albums →</Link>
      </div>
    );
  }

  return (
    <NewThread album={{ spotifyId: sp.album, title: sp.title, artist: sp.artist, artwork: sp.artwork ?? null }} />
  );
}
