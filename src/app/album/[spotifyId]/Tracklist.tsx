"use client";
import { useState, useRef, useEffect } from "react";

interface Track {
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

function fmt(ms: number) {
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
}

function youtubeUrl(artist: string, track: string) {
  // Opens YouTube with the song queued so the top result (usually the official
  // track) plays in a new tab.
  const q = encodeURIComponent(`${artist} ${track}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export default function Tracklist({ tracks, artist }: { tracks: Track[]; artist: string }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fully stop and release the current preview.
  function stop() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.src = "";
      audioRef.current = null;
    }
  }

  // Stop playback when the album page unmounts (e.g. pressing back) so audio
  // doesn't keep playing, and the next album starts a preview from the beginning.
  useEffect(() => stop, []);

  function toggle(idx: number, previewUrl: string) {
    if (playing === idx) {
      stop();
      setPlaying(null);
      return;
    }
    stop();
    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    audio.onended = () => { setPlaying(null); audioRef.current = null; };
    audioRef.current = audio;
    setPlaying(idx);
  }

  return (
    <div>
      <p className="text-[10px]  text-[#6b6b6b] uppercase tracking-[0.15em] mb-2">
        Tracklist
      </p>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {tracks.map((t, i) => (
          <div
            key={t.track_number}
            className="flex items-center gap-2 py-1 group rounded px-1 hover:bg-[#222222] transition-colors"
          >
            <span className="text-[#6b6b6b] text-xs w-4 text-right shrink-0">
              {t.track_number}
            </span>

            {t.preview_url ? (
              <button
                onClick={() => toggle(i, t.preview_url!)}
                className="shrink-0 w-5 h-5 flex items-center justify-center text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
                title={playing === i ? "Pause preview" : "Play 30s preview"}
              >
                {playing === i ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1" y="1" width="3" height="8" rx="0.5" />
                    <rect x="6" y="1" width="3" height="8" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <polygon points="1,1 9,5 1,9" />
                  </svg>
                )}
              </button>
            ) : (
              <span className="shrink-0 w-5" />
            )}

            {/* Tapping the song opens it in Spotify — the app itself on a phone,
                since open.spotify.com links are universal links. */}
            <a
              href={t.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm truncate flex-1 transition-colors hover:text-[#1DB954] ${
                playing === i ? "text-[#c4a832]" : "text-[#bbbbbb]"
              }`}
              title={`Play ${t.name} on Spotify`}
            >
              {t.name}
            </a>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-xs text-[#6b6b6b]">{fmt(t.duration_ms)}</span>
              {/* Always visible on touch (there is no hover to reveal them), and
                  kept as a hover flourish from the sm breakpoint up. */}
              <a
                href={t.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6b6b6b] hover:text-[#1DB954] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Play on Spotify"
                aria-label={`Play ${t.name} on Spotify`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.601.301.96zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
              <a
                href={youtubeUrl(artist, t.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6b6b6b] hover:text-[#FF0000] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Play on YouTube"
                aria-label={`Play ${t.name} on YouTube`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
