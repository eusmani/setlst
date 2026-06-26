interface CoverAlbum { artwork: string | null }

// Square crate thumbnail: a custom cover photo if set, otherwise a 2×2 collage
// of the first four album covers (filling empty cells with placeholders).
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

  const arts = albums.slice(0, 4).map((a) => a.artwork);
  while (arts.length < 4) arts.push(null);

  return (
    <div className={`w-full aspect-square grid grid-cols-2 grid-rows-2 bg-[#222222] overflow-hidden ${className}`}>
      {arts.map((art, i) =>
        art ? (
          <img key={i} src={art} alt="" className="w-full h-full object-cover" />
        ) : (
          <div key={i} className="w-full h-full bg-[#222222] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="1.4">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" />
            </svg>
          </div>
        )
      )}
    </div>
  );
}
