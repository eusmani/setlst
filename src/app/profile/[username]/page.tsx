import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import ReviewsGrid from "./ReviewsGrid";
import FollowButton from "./FollowButton";
import TopAlbums from "./TopAlbums";
import Crates from "./Crates";
import Discussions from "./Discussions";
import EditProfile from "./EditProfile";
import FollowRequests from "./FollowRequests";

export const dynamic = "force-dynamic";

// iTunes titles carry "- EP" / "- Single" suffixes; everything else is a full album.
function releaseType(title: string): "album" | "ep" | "single" {
  const t = title.trim();
  if (/[-–—]\s*single\s*$/i.test(t)) return "single";
  if (/[-–—]\s*ep\s*$/i.test(t)) return "ep";
  return "album";
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { username } = await params;
  const { show } = await searchParams;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      reviews: {
        include: { album: true, likes: { select: { value: true, userId: true } } },
        orderBy: { createdAt: "desc" },
      },
      artistFollows: { orderBy: { createdAt: "desc" } },
      _count: { select: { followers: true, following: true, reviews: true } },
    },
  });
  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;
  const isFollowing = session && !isOwnProfile
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
      }))
    : false;
  const hasRequested = session && !isOwnProfile
    ? !!(await prisma.followRequest.findUnique({
        where: { requesterId_targetId: { requesterId: session.user.id, targetId: user.id } },
      }))
    : false;

  // Private accounts hide their content from everyone except the owner and accepted followers.
  const contentLocked = user.isPrivate && !isOwnProfile && !isFollowing;

  // Pending follow requests to show on your own (private) profile.
  const followRequests = isOwnProfile
    ? (await prisma.followRequest.findMany({
        where: { targetId: user.id },
        include: { requester: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      })).map((r) => r.requester)
    : [];

  // History / activity stats (Letterboxd-style)
  const reviewedCounts = user.reviews.reduce(
    (acc, r) => { acc[releaseType(r.album.title)]++; return acc; },
    { album: 0, ep: 0, single: 0 } as Record<"album" | "ep" | "single", number>
  );
  const [wishlistCount, commentLikesReceived, discussionsCount, threadReplyCount, commentCount] = await Promise.all([
    prisma.savedAlbum.count({ where: { userId: user.id } }),
    prisma.commentLike.count({ where: { comment: { userId: user.id } } }),
    prisma.thread.count({ where: { userId: user.id } }),
    prisma.threadReply.count({ where: { userId: user.id } }),
    prisma.comment.count({ where: { userId: user.id } }),
  ]);

  const base = `/profile/${user.username}`;
  const activity = [
    { label: "Albums reviewed", val: reviewedCounts.album, href: `${base}/reviews?type=album` },
    { label: "EPs reviewed", val: reviewedCounts.ep, href: `${base}/reviews?type=ep` },
    { label: "Singles reviewed", val: reviewedCounts.single, href: `${base}/reviews?type=single` },
    { label: "Discussions", val: discussionsCount, href: `${base}/discussions` },
    { label: "Replies", val: threadReplyCount + commentCount, href: `${base}/discussions` },
    { label: "Listen list", val: wishlistCount, href: `${base}/wishlist` },
    { label: "Likes on comments", val: commentLikesReceived, href: `${base}/likes` },
  ];

  const shownType = show === "album" || show === "ep" || show === "single" ? show : null;
  const visibleReviews = shownType
    ? user.reviews.filter((r) => releaseType(r.album.title) === shownType)
    : user.reviews;

  let topAlbums: { spotifyId: string; title: string; artist: string; artwork: string | null }[] = [];
  try { topAlbums = user.topAlbums ? JSON.parse(user.topAlbums) : []; } catch {}

  return (
    <div className="relative isolate max-w-4xl mx-auto px-5 py-12">
      {/* Faded pfp banner — sits just under the top bar and fades down the page */}
      {user.avatar && (
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen -z-10 h-72 overflow-hidden">
          <img
            src={user.avatar}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-30"
            style={{
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-5 pb-8 mb-8 border-b border-[#1f1f1f]">
        <Avatar username={user.username} avatar={user.avatar} size={68} />

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <div>
              <h1 className="font-serif text-2xl  text-[#f0f0f0] flex items-center gap-2">
                {user.username}
                {user.isPrivate && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#6b6b6b] border border-[#2e2e2e] rounded-full px-2 py-0.5 font-sans tracking-normal" title="Private account">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Private
                  </span>
                )}
              </h1>
              {user.bio && <p className="text-sm text-[#a0a0a0] mt-1 max-w-sm">{user.bio}</p>}
            </div>
            {!isOwnProfile && session && (
              <div className="flex items-center gap-2">
                <FollowButton username={user.username} initial={isFollowing} initialRequested={hasRequested} isPrivate={user.isPrivate} />
                <Link
                  href={`/inbox/${user.username}`}
                  className="flex items-center gap-1.5 text-sm border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#c4a832] px-3 py-1.5 rounded-full transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  Message
                </Link>
              </div>
            )}
            {isOwnProfile && (
              <EditProfile username={user.username} initialBio={user.bio} initialAvatar={user.avatar} initialPhone={user.phone} initialEmail={user.email} />
            )}
          </div>

          <div className="flex items-center gap-6">
            {[
              { val: user._count.reviews, label: "reviews", href: `${base}/reviews` },
              { val: user._count.followers, label: "followers", href: `${base}/followers` },
              // Following = people followed + artists followed, merged into one list.
              { val: user._count.following + user.artistFollows.length, label: "following", href: `${base}/following` },
            ].map(({ val, label, href }) => {
              const inner = (
                <>
                  <p className="text-base text-[#f0f0f0]">{val}</p>
                  <p className="text-xs text-[#6b6b6b]">{label}</p>
                </>
              );
              return href ? (
                <Link key={label} href={href} className="group">
                  <p className="text-base text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors">{val}</p>
                  <p className="text-xs text-[#6b6b6b]">{label}</p>
                </Link>
              ) : (
                <div key={label}>{inner}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending follow requests (own private profile) */}
      {isOwnProfile && followRequests.length > 0 && (
        <FollowRequests
          initial={followRequests.map((r) => ({ username: r.username, avatar: r.avatar }))}
        />
      )}

      {contentLocked ? (
        <div className="text-center py-16 bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.6" className="mx-auto mb-3">
            <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="text-sm text-[#f0f0f0] mb-1">This account is private</p>
          <p className="text-xs text-[#6b6b6b]">
            {hasRequested
              ? "Your follow request is pending. You'll see their reviews once accepted."
              : `Request to follow ${user.username} to see their reviews and lists.`}
          </p>
        </div>
      ) : (
      <>
      {/* Favorite albums */}
      <div id="favorites" className="scroll-mt-24">
        <TopAlbums initial={topAlbums} isOwner={isOwnProfile} />
      </div>

      {/* Crates — user-curated folders of favorite albums */}
      <div id="crates" className="scroll-mt-24">
        <Crates username={user.username} isOwner={isOwnProfile} />
      </div>

      {/* Discussions — threads created or replied to */}
      <div id="discussions" className="scroll-mt-24">
        <Discussions username={user.username} isOwner={isOwnProfile} />
      </div>

      {/* Reviews */}
      <div id="reviews" className="scroll-mt-24 flex items-center gap-3 mb-4">
        <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em]">
          Reviews{shownType ? ` · ${shownType === "ep" ? "EPs" : shownType === "single" ? "Singles" : "Albums"}` : ""}
        </h2>
        {shownType && (
          <Link href="?#reviews" className="text-xs text-[#c4a832] hover:underline">Show all</Link>
        )}
      </div>

      {visibleReviews.length === 0 ? (
        <div className="text-center py-12 text-[#6b6b6b] text-sm">No reviews yet.</div>
      ) : (
        <ReviewsGrid
          isLoggedIn={!!session}
          isOwner={isOwnProfile}
          username={user.username}
          reviews={visibleReviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            subject: r.subject ?? null,
            body: r.body ?? null,
            favoriteSong: r.favoriteSong ?? null,
            leastFavoriteSong: r.leastFavoriteSong ?? null,
            showSongs: r.showSongs,
            createdAt: r.createdAt.toISOString(),
            user: { id: user.id, username: user.username, avatar: user.avatar ?? null },
            album: { spotifyId: r.album.spotifyId, title: r.album.title, artist: r.album.artist, artwork: r.album.artwork ?? null },
            likeCount: r.likes.filter((l) => l.value === 1).length,
            dislikeCount: r.likes.filter((l) => l.value === -1).length,
            myVote: session ? (r.likes.find((l) => l.userId === session.user.id)?.value ?? 0) : 0,
          }))}
        />
      )}

      {/* Activity / history */}
      <h2 className="text-xl text-[#a0a0a0] uppercase tracking-[0.15em] mt-10 mb-2">Activity</h2>
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg divide-y divide-[#1f1f1f]">
        {activity.map(({ label, val, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-[#222222] transition-colors group"
          >
            <span className="text-xs text-[#a0a0a0] group-hover:text-[#f0f0f0] transition-colors">{label}</span>
            <span className="text-xs text-[#f0f0f0] tabular-nums">{val}</span>
          </Link>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
