import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CrateView from "./CrateView";

export const dynamic = "force-dynamic";

export default async function CratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const crate = await prisma.crate.findUnique({
    where: { id },
    include: {
      user: { select: { username: true } },
      albums: {
        orderBy: { addedAt: "desc" },
        select: { id: true, spotifyId: true, title: true, artist: true, artwork: true, year: true },
      },
    },
  });

  if (!crate) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">Crate not found.</p>
        <Link href="/" className="text-xs text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const isOwner = session?.user?.id === crate.userId;

  return (
    <CrateView
      crate={{ id: crate.id, name: crate.name, cover: crate.cover, username: crate.user.username, albums: crate.albums }}
      isOwner={isOwner}
    />
  );
}
