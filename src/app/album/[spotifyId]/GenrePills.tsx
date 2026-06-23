import Link from "next/link";

export default function GenrePills({ genres }: { genres: string[]; currentId?: string }) {
  if (genres.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {genres.map((g) => (
        <Link
          key={g}
          href={`/genre/${encodeURIComponent(g)}`}
          className="text-xs px-2.5 py-1 rounded-full border bg-[#222222] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0] transition-colors"
        >
          {g}
        </Link>
      ))}
    </div>
  );
}
