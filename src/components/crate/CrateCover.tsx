interface CoverAlbum { artwork: string | null }

// Square crate thumbnail. A custom cover photo wins; otherwise the collage only
// appears once there are four real album covers to build it from — a 2×2 grid of
// the first four. Below that it stays a plain blank square (no placeholder art).
export default function CrateCover({
  cover,
  albums,
  className = "",
}: {
  cover?: string | null;
  albums: CoverAlbum[];
  className?: string;
}) {
  if (cover) {
    return <img src={cover} alt="" className={`w-full aspect-square object-cover ${className}`} />;
  }

  // Only the first four albums that actually have artwork can form the collage.
  const arts = albums.map((a) => a.artwork).filter((a): a is string => !!a).slice(0, 4);

  if (arts.length < 4) {
    return <div className={`w-full aspect-square bg-[#222222] ${className}`} />;
  }

  return (
    <div className={`w-full aspect-square grid grid-cols-2 grid-rows-2 bg-[#222222] overflow-hidden ${className}`}>
      {arts.map((art, i) => (
        <img key={i} src={art} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}
