import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

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
    include: { user: { select: { username: true, avatar: true } }, _count: { select: { replies: true } } },
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
        <div className="space-y-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/thread/${t.id}`}
              className="flex gap-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl p-4 transition-colors group">
              {t.albumArtwork && (
                <img src={t.albumArtwork} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Avatar username={t.user.username} avatar={t.user.avatar} size={18} />
                  <span className="text-xs text-[#a0a0a0] truncate">{t.user.username}</span>
                </div>
                <p className="text-base text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors leading-snug mt-1">{t.title}</p>
                <p className="text-sm text-[#a0a0a0] line-clamp-3 mt-1 leading-relaxed">{t.body}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#6b6b6b]">
                  <span className="truncate">{t.albumTitle} · {t.albumArtist}</span>
                  <span>· {t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
