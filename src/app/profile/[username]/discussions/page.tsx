import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserDiscussionsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!u) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-12 text-center">
        <p className="text-[#6b6b6b] text-sm mb-3">User not found.</p>
        <Link href="/" className="text-xs text-[#c4a832] hover:underline">← Home</Link>
      </div>
    );
  }

  const repliedIds = await prisma.threadReply.findMany({ where: { userId: u.id }, select: { threadId: true } });
  const ids = [...new Set(repliedIds.map((r) => r.threadId))];
  const threads = await prisma.thread.findMany({
    where: { OR: [{ userId: u.id }, { id: { in: ids } }] },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { replies: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
      <Link href={`/profile/${username}`} className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← {username}</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-2 mb-5">Discussions</h1>

      {threads.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm">No discussions yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/thread/${t.id}`}
              className="flex flex-col bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl p-3 transition-colors group min-h-[96px]">
              <span className="text-[9px] uppercase tracking-wide text-[#c4a832] mb-1">{t.userId === u.id ? "Started" : "Replied"}</span>
              <p className="text-sm text-[#f0f0f0] line-clamp-2 group-hover:text-[#c4a832] transition-colors leading-snug">{t.title}</p>
              <p className="text-[11px] text-[#6b6b6b] truncate mt-auto pt-1">{t.albumTitle}</p>
              <p className="text-[11px] text-[#6b6b6b]">{t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
