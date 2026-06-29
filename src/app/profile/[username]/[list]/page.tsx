import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import AlbumCard from "@/components/album/AlbumCard";

export const dynamic = "force-dynamic";

function releaseType(title: string): "album" | "ep" | "single" {
  const t = title.trim();
  if (/[-–—]\s*single\s*$/i.test(t)) return "single";
  if (/[-–—]\s*ep\s*$/i.test(t)) return "ep";
  return "album";
}


const LISTS = ["reviews", "wishlist", "likes", "following", "followers"] as const;
type ListKind = (typeof LISTS)[number];

export default async function ProfileListPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; list: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { username, list } = await params;
  const { type } = await searchParams;
  if (!LISTS.includes(list as ListKind)) notFound();

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, isPrivate: true } });
  if (!user) notFound();

  // Private accounts: only the owner and accepted followers can view these lists.
  if (user.isPrivate) {
    const session = await auth();
    const isOwner = session?.user?.id === user.id;
    const isFollower = session && !isOwner
      ? !!(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
        }))
      : false;
    if (!isOwner && !isFollower) {
      return (
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <Link href={`/profile/${user.username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
            ← {user.username}
          </Link>
          <p className="text-sm text-[#f0f0f0] mt-6 mb-1">This account is private</p>
          <p className="text-xs text-[#6b6b6b]">Follow {user.username} to see this.</p>
        </div>
      );
    }
  }

  const filterType = type === "album" || type === "ep" || type === "single" ? type : null;

  let title = "";
  let body: React.ReactNode = null;

  if (list === "reviews") {
    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      include: { album: true },
      orderBy: { createdAt: "desc" },
    });
    const filtered = filterType ? reviews.filter((r) => releaseType(r.album.title) === filterType) : reviews;
    title =
      filterType === "ep" ? "EPs reviewed" : filterType === "single" ? "Singles reviewed" : filterType === "album" ? "Albums reviewed" : "All reviewed";
    body =
      filtered.length === 0 ? (
        <Empty label="Nothing reviewed yet." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <AlbumCard
              key={r.id}
              spotifyId={r.album.spotifyId}
              title={r.album.title}
              artist={r.album.artist}
              artwork={r.album.artwork}
              year={r.album.year}
              avgRating={r.rating}
            />
          ))}
        </div>
      );
  } else if (list === "wishlist") {
    title = "Listen list";
    const saved = await prisma.savedAlbum.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    body =
      saved.length === 0 ? (
        <Empty label="No saved albums yet." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {saved.map((s) => (
            <AlbumCard
              key={s.id}
              spotifyId={s.spotifyId}
              title={s.title}
              artist={s.artist}
              artwork={s.artwork}
              year={s.year}
            />
          ))}
        </div>
      );
  } else if (list === "following") {
    title = "Following";
    const [people, artists] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.artistFollow.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);
    body =
      people.length === 0 && artists.length === 0 ? (
        <Empty label="Not following anyone yet." />
      ) : (
        <ul className="space-y-2">
          {people.map((f) => (
            <li key={`u-${f.id}`}>
              <Link
                href={`/profile/${f.following.username}`}
                className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl group transition-colors"
              >
                <Avatar username={f.following.username} avatar={f.following.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{f.following.username}</p>
                  <p className="text-xs text-[#6b6b6b]">Member</p>
                </div>
              </Link>
            </li>
          ))}
          {artists.map((a) => (
            <li key={`a-${a.id}`}>
              <Link
                href={`/artist/${encodeURIComponent(a.artist)}`}
                className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl group transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.6">
                    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{a.artist}</p>
                  <p className="text-xs text-[#6b6b6b]">Artist</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
  } else if (list === "followers") {
    title = "Followers";
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    body =
      followers.length === 0 ? (
        <Empty label="No followers yet." />
      ) : (
        <ul className="space-y-2">
          {followers.map((f) => (
            <li key={f.id}>
              <Link
                href={`/profile/${f.follower.username}`}
                className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl group transition-colors"
              >
                <Avatar username={f.follower.username} avatar={f.follower.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{f.follower.username}</p>
                  <p className="text-xs text-[#6b6b6b]">Member</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
  } else {
    // likes on comments — the user's comments and the likes they received
    title = "Likes on comments";
    const comments = await prisma.comment.findMany({
      where: { userId: user.id, likes: { some: {} } },
      include: { _count: { select: { likes: true } } },
      orderBy: { createdAt: "desc" },
    });
    body =
      comments.length === 0 ? (
        <Empty label="No liked comments yet." />
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id}>
              <Link
                href={`/album/${c.albumSpotifyId}`}
                className="flex items-start gap-3 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl group transition-colors"
              >
                <p className="flex-1 min-w-0 text-sm text-[#d8d8d8] group-hover:text-[#f0f0f0] transition-colors">{c.body}</p>
                <span className="shrink-0 flex items-center gap-1 text-xs text-[#c4a832]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {c._count.likes}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link href={`/profile/${user.username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
        ← {user.username}
      </Link>
      <h1 className="font-serif text-2xl text-[#f0f0f0] mt-2 mb-6">{title}</h1>
      {body}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center py-12 text-[#6b6b6b] text-sm">{label}</div>;
}
