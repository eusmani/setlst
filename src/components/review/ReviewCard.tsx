import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { ratingTier } from "@/lib/rating";
import ReviewVotes from "./ReviewVotes";
import ClampedBody from "./ClampedBody";
import ContentMenu from "@/components/moderation/ContentMenu";

export interface ReviewData {
  id: string;
  rating: number;
  subject?: string | null;
  body?: string | null;
  favoriteSong?: string | null;
  leastFavoriteSong?: string | null;
  showSongs?: boolean;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  album: { spotifyId: string; title: string; artist: string; artwork: string | null };
  likeCount?: number;
  dislikeCount?: number;
  myVote?: number;
  _count?: { likes: number };
}

interface Props {
  review: ReviewData;
  showAlbum?: boolean;
  isLoggedIn?: boolean;
  clampBody?: boolean; // activity feed: show 2 lines, tap to expand
}

// Opens YouTube with the song queued so the top result (usually the official track) plays.
function youtubeUrl(artist: string, track: string) {
  const q = encodeURIComponent(`${artist} ${track}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export default function ReviewCard({ review, showAlbum = true, isLoggedIn = false, clampBody = false }: Props) {
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const tier = ratingTier(review.rating);

  return (
    <article className="flex gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      {showAlbum && review.album.artwork && (
        <Link href={`/album/${review.album.spotifyId}`} className="shrink-0 self-start">
          <img
            src={review.album.artwork}
            alt={review.album.title}
            width={48}
            height={48}
            className="rounded-md object-cover w-12 h-12"
          />
        </Link>
      )}

      <div className="flex-1 min-w-0">
        {showAlbum && (
          <div className="mb-2">
            <Link
              href={`/album/${review.album.spotifyId}`}
              className="text-[#f0f0f0] hover:text-[#c4a832] transition-colors text-sm leading-snug"
            >
              {review.album.title}
            </Link>
            <span className="text-[#6b6b6b] text-xs ml-1.5">{review.album.artist}</span>
          </div>
        )}

        {/* Grade word + subject on the left, circled grade letter on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: tier.color }}
            >
              {tier.word}
            </p>

            {review.showSongs !== false && (review.favoriteSong || review.leastFavoriteSong) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                {review.favoriteSong && (
                  <a
                    href={youtubeUrl(review.album.artist, review.favoriteSong)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/song"
                  >
                    <span className="text-[#c4a832]">♥</span>{" "}
                    <span className="text-[#bbbbbb] group-hover/song:text-[#f0f0f0] group-hover/song:underline transition-colors">{review.favoriteSong}</span>
                  </a>
                )}
                {review.leastFavoriteSong && (
                  <a
                    href={youtubeUrl(review.album.artist, review.leastFavoriteSong)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/song"
                  >
                    <span className="text-[#9d6b6b]">✕</span>{" "}
                    <span className="text-[#bbbbbb] group-hover/song:text-[#f0f0f0] group-hover/song:underline transition-colors">{review.leastFavoriteSong}</span>
                  </a>
                )}
              </div>
            )}

            {review.subject && (
              <p className="text-sm text-[#f0f0f0] font-semibold leading-snug mt-2 break-words">{review.subject}</p>
            )}
          </div>

          <div
            className="shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: tier.color, background: `${tier.color}1a` }}
            title={`${tier.letter} — ${tier.word}`}
          >
            <span className="text-sm font-bold" style={{ color: tier.color }}>{tier.letter}</span>
          </div>
        </div>

        {review.body && (
          clampBody
            ? <ClampedBody text={review.body} />
            : <p className="text-[15px] text-[#bbbbbb] leading-relaxed mt-2.5 break-words whitespace-pre-wrap">{review.body}</p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <Link href={`/profile/${review.user.username}`} className="flex items-center gap-1.5 group">
            <Avatar username={review.user.username} avatar={review.user.avatar} size={16} />
            <span className="text-xs text-[#a0a0a0] group-hover:text-[#f0f0f0] transition-colors">
              {review.user.username}
            </span>
          </Link>
          <span className="text-[#6b6b6b] text-xs">·</span>
          <span className="text-xs text-[#6b6b6b]">{date}</span>
          {/* Report / block, on every review (App Store guideline 1.2). */}
          <ContentMenu
            contentType="review"
            contentId={review.id}
            authorUsername={review.user.username}
            label="this review"
            className="ml-auto"
          />
        </div>

        {/* Like / dislike / share */}
        <div className="mt-3">
          <ReviewVotes
            reviewId={review.id}
            initialLikes={review.likeCount ?? review._count?.likes ?? 0}
            initialDislikes={review.dislikeCount ?? 0}
            initialMyVote={review.myVote ?? 0}
            isLoggedIn={isLoggedIn}
            shareUrl={`/album/${review.album.spotifyId}`}
            shareText={`${review.user.username} gave ${review.album.title} a ${tier.letter} — ${tier.word} on SETLST`}
            story={{
              title: review.album.title,
              artist: review.album.artist,
              artwork: review.album.artwork,
              rating: review.rating,
              subject: review.subject,
              body: review.body,
              username: review.user.username,
              path: `/album/${review.album.spotifyId}`,
            }}
          />
        </div>
      </div>
    </article>
  );
}
