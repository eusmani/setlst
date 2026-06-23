"use client";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";
import Tracklist from "./Tracklist";

interface Album {
  spotifyId: string; title: string; artist: string;
  artwork?: string | null; year?: number | null; genres?: string[];
}

interface Track {
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface ReviewDraft {
  rating: number;
  subject: string | null;
  body: string | null;
  favoriteSong: string | null;
  leastFavoriteSong: string | null;
  showSongs: boolean;
}

interface Props {
  album: Album;
  tracks: Track[];
  reviews: ReviewData[];
  isLoggedIn: boolean;
}

export default function AlbumClient({ album, tracks, reviews: init, isLoggedIn }: Props) {
  return (
    <div className="space-y-8">
      {/* Listen list */}
      {tracks.length > 0 && <Tracklist tracks={tracks} artist={album.artist} />}

      {/* Reviews */}
      <div>
        <h2 className="text-base font-semibold text-[#f0f0f0] mb-4">
          Reviews ({init.length})
        </h2>
        {init.length === 0 ? (
          <div className="text-center py-10 text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl text-sm">
            No reviews yet — be the first.
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl px-4">
            {init.map((r) => (
              <ReviewCard key={r.id} review={r} showAlbum={false} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
