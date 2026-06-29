import Link from "next/link";
import GenreResults from "./GenreResults";

export const dynamic = "force-dynamic";

export default async function GenrePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const genre = decodeURIComponent(name);

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Link href="/search" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors mb-6 block">
        ← Back to search
      </Link>

      <div className="mb-8">
        <p className="text-[11px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-1">Genre</p>
        <h1 className="font-serif text-3xl text-[#f0f0f0]">{genre}</h1>
        <p className="text-sm text-[#6b6b6b] mt-1">Albums in this genre · click any to review</p>
      </div>

      <GenreResults genre={genre} />
    </div>
  );
}
