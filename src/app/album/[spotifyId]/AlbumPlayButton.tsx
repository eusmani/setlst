"use client";
import { useEffect, useState } from "react";

interface Props {
  youtubeUrl: string;
  title: string;
}

export default function AlbumPlayButton({ youtubeUrl, title }: Props) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  // Hidden on touch devices (no hover) — desktop shows it on hover.
  if (isTouch) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Play ${title} on YouTube`}
        title="Play on YouTube"
        className="pointer-events-auto group/play w-16 h-16 rounded-full bg-black/55 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/cover:opacity-100 hover:bg-[#c4a832] hover:scale-105"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" className="ml-1 fill-white group-hover/play:fill-[#111111] transition-colors">
          <path d="M8 5v14l11-7z" />
        </svg>
      </a>
    </div>
  );
}
