"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CrateCover from "@/components/crate/CrateCover";

interface Album {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}
interface CrateData {
  id: string;
  name: string;
  cover: string | null;
  username: string;
  albums: Album[];
}

// Resize an uploaded image to a small square data URL (no external storage).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function albumHref(a: Album) {
  const p = new URLSearchParams({ title: a.title, artist: a.artist });
  if (a.artwork) p.set("artwork", a.artwork);
  if (a.year) p.set("year", String(a.year));
  return `/album/${a.spotifyId}?${p.toString()}`;
}

export default function CrateView({ crate, isOwner }: { crate: CrateData; isOwner: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(crate.name);
  const [cover, setCover] = useState(crate.cover);
  const [albums, setAlbums] = useState(crate.albums);
  const fileRef = useRef<HTMLInputElement>(null);

  async function patch(data: Record<string, unknown>) {
    await fetch("/api/crates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crate.id, ...data }),
    });
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setCover(dataUrl);
    await patch({ cover: dataUrl });
  }

  async function removeCover() {
    setCover(null);
    await patch({ cover: null });
  }

  async function rename() {
    const next = prompt("Rename crate", name)?.trim();
    if (!next || next === name) return;
    setName(next);
    await patch({ name: next });
  }

  async function removeAlbum(a: Album) {
    setAlbums((list) => list.filter((x) => x.id !== a.id));
    await fetch(`/api/crates/albums?crateId=${crate.id}&spotifyId=${encodeURIComponent(a.spotifyId)}`, { method: "DELETE" });
  }

  async function deleteCrate() {
    if (!confirm("Delete this crate?")) return;
    await fetch(`/api/crates?id=${crate.id}`, { method: "DELETE" });
    router.push(`/profile/${crate.username}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      <Link href={`/profile/${crate.username}`} className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
        ← {crate.username}&apos;s profile
      </Link>

      {/* Header */}
      <div className="flex gap-4 mt-4 mb-7">
        <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-[#1f1f1f]">
          <CrateCover cover={cover} albums={albums} />
        </div>
        <div className="min-w-0 flex flex-col justify-end">
          <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-1">Crate</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#f0f0f0] leading-tight break-words">{name}</h1>
          <p className="text-xs text-[#a0a0a0] mt-1">{albums.length} {albums.length === 1 ? "album" : "albums"}</p>

          {isOwner && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
              <button onClick={() => fileRef.current?.click()} className="text-[#c4a832] hover:underline">
                {cover ? "Change photo" : "Add custom photo"}
              </button>
              {cover && <button onClick={removeCover} className="text-[#6b6b6b] hover:text-[#f0f0f0]">Use album collage</button>}
              <button onClick={rename} className="text-[#6b6b6b] hover:text-[#f0f0f0]">Rename</button>
              <button onClick={deleteCrate} className="text-[#6b6b6b] hover:text-red-400">Delete</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
            </div>
          )}
        </div>
      </div>

      {/* Album list */}
      {albums.length === 0 ? (
        <div className="py-14 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl">
          <p className="text-sm mb-2">This crate is empty.</p>
          {isOwner && <Link href="/search" className="text-xs text-[#c4a832] hover:underline">Find albums to add →</Link>}
        </div>
      ) : (
        <div className="space-y-2">
          {albums.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl group">
              <Link href={albumHref(a)} className="flex items-center gap-3 flex-1 min-w-0">
                {a.artwork ? (
                  <img src={a.artwork} alt={a.title} className="w-12 h-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#222222] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[#f0f0f0] truncate group-hover:text-[#c4a832] transition-colors">{a.title}</p>
                  <p className="text-xs text-[#a0a0a0] truncate">{a.artist}{a.year ? ` · ${a.year}` : ""}</p>
                </div>
              </Link>
              {isOwner && (
                <button onClick={() => removeAlbum(a)} aria-label="Remove from crate"
                  className="shrink-0 text-[#6b6b6b] hover:text-red-400 transition-colors p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
