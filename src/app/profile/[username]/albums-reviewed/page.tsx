import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlbumsReviewedPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">User not found.</p>
        <Link href="/" className="text-sm text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true,
      album: { select: { spotifyId: true, title: true, artist: true, artwork: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
      <Link href={`/profile/${username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← {username}</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-2 mb-1">Albums reviewed</h1>
      <p className="text-xs text-[#6b6b6b] mb-5">{reviews.length} {reviews.length === 1 ? "album" : "albums"} · most recent first</p>

      {reviews.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm">No reviews yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {reviews.map((r) => (
            <Link key={r.id} href={`/album/${r.album.spotifyId}`} className="group block">
              <div className="relative aspect-square rounded-lg overflow-hidden border border-[#1f1f1f] group-hover:border-[#2e2e2e] transition-colors">
                {r.album.artwork ? (
                  <img src={r.album.artwork} alt={r.album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#222222]" />
                )}
                <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-[#f0f0f0]">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#c4a832"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {r.rating}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#f0f0f0] truncate leading-snug group-hover:text-[#c4a832] transition-colors">{r.album.title}</p>
              <p className="text-[11px] text-[#6b6b6b] truncate">{r.album.artist}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
