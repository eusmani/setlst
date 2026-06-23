"use client";
import { useEffect, useState } from "react";

// A blurred, full-screen album-art backdrop behind the page content. Starts at
// 50% opacity and fades out as you scroll down. Sits at z-0 (the page content is
// lifted to z-10 above it) so it shows over the themed page background.
export default function AlbumBackdrop({ artwork }: { artwork: string }) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const fade = Math.max(0, 1 - window.scrollY / 500); // fully gone after ~500px
      setOpacity(fade);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mask = "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity, transition: "opacity 80ms linear" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center blur-2xl scale-110"
        style={{
          backgroundImage: `url(${artwork})`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </div>
  );
}
