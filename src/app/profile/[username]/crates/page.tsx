import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Crates from "../Crates";

export const dynamic = "force-dynamic";

export default async function UserCratesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">User not found.</p>
        <Link href="/" className="text-sm text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const isOwner = session?.user?.id === user.id;

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
      <Link href={`/profile/${username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← {username}</Link>
      <div className="mt-2">
        <Crates username={username} isOwner={isOwner} showAll />
      </div>
    </div>
  );
}
