"use client";
import { useState, useRef } from "react";

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

  function toggle(idx: number, previewUrl: string) {
    if (playing === idx) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audio.play();
    audio.onended = () => setPlaying(null);
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

            <span
              className={`text-sm truncate flex-1 transition-colors ${
                playing === i ? "text-[#c4a832]" : "text-[#bbbbbb]"
              }`}
            >
              {t.name}
            </span>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-xs text-[#6b6b6b]">{fmt(t.duration_ms)}</span>
              <a
                href={youtubeUrl(artist, t.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6b6b6b] hover:text-[#FF0000] transition-colors opacity-0 group-hover:opacity-100"
                title="Play on YouTube"
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
