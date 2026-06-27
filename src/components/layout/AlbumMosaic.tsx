"use client";

import { useEffect, useState } from "react";

// 50/50 mix of recent acclaimed albums and older classics, interleaved.
// Verified real artist albums only (no parody/tribute), covers from Apple Music.
export const ARTWORKS = [
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/3e/17/ec/3e17ec6d-f980-c64f-19e0-a6fd8bbf0c10/886445635850.jpg/600x600bb.jpg", // The Wall — Pink Floyd
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/46/24/33/462433f9-ee74-2d60-4538-859826a7bed7/00720642472729.rgb.jpg/600x600bb.jpg", // MTV Unplugged — Nirvana
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/c6/9c/17/c69c17df-1835-77e7-58c1-ca04d44a0611/196871853736.jpg/600x600bb.jpg", // COWBOY CARTER — Beyoncé
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/eb/cc/b9ebccbc-5ba4-2cdb-5332-b065739abd9a/886444567619.jpg/600x600bb.jpg", // Illmatic — Nas
  "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/42/a0/c5/42a0c5e6-6b98-f1f9-7d6b-6d6c61aba562/23UMGIM84225.rgb.jpg/600x600bb.jpg", // Midwest Princess — Chappell Roan
  "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/fe/ba/43/feba43be-99e8-ad8c-9fad-1bfdea7a4e98/196589344267.jpg/600x600bb.jpg", // RENAISSANCE — Beyoncé
  "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg", // OK Computer — Radiohead
  "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/62/93/13/6293132e-20ff-67ab-3d1f-96bb6797a6ba/196589564955.jpg/600x600bb.jpg", // SOS — SZA
  "https://is1-ssl.mzstatic.com/image/thumb/Music/7f/9f/d6/mzi.vtnaewef.jpg/600x600bb.jpg", // Kind of Blue — Miles Davis
  "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9e/0d/17/9e0d17e0-c068-fbd9-fd85-610cc87c86aa/23UMGIM71511.rgb.jpg/600x600bb.jpg", // GUTS — Olivia Rodrigo
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/600x600bb.jpg", // Abbey Road — The Beatles
  "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6b/17/e6/6b17e679-70e0-e00e-93e1-5af4d25ee8c8/22UMGIM52376.rgb.jpg/600x600bb.jpg", // Mr. Morale — Kendrick Lamar
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/600x600bb.jpg", // Thriller — Michael Jackson
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg", // HIT ME HARD AND SOFT — Billie Eilish
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4d/13/ba/4d13bac3-d3d5-7581-2c74-034219eadf2b/081227970949.jpg/600x600bb.jpg", // Rumours — Fleetwood Mac
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/b6/ef/ee/b6efeefa-fc99-37d1-ad21-0d769b2a4958/196872796971.jpg/600x600bb.jpg", // CHROMAKOPIA — Tyler, the Creator
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/00/17/f2/0017f24f-e580-b77a-71a8-1bc7b75881bf/603497822065.jpg/600x600bb.jpg", // Purple Rain — Prince
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/0e/e7/e00ee7a1-0629-7912-fdb2-579057bba619/0045778801367.png/600x600bb.jpg", // Manning Fireworks — MJ Lenderman
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/00/a2/43/00a24363-cf69-bfd2-a26a-a042d57ab141/075992719926.jpg/600x600bb.jpg", // Blue — Joni Mitchell
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8f/6a/c6/8f6ac6c6-5bcd-fa25-94f2-fd9922725215/5054429151442.png/600x600bb.jpg", // Ants From Up There — Black Country, New Road
  "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/600x600bb.jpg", // In Rainbows — Radiohead
  "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/27/6b/4c/276b4c69-99cb-6209-2fd8-3edd17ccfd06/00602517641228.rgb.jpg/600x600bb.jpg", // 2001 — Dr. Dre
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f7/8c/19/f78c1951-ced5-fea6-251b-50914d96fd62/00196922948305_Cover.jpg/600x600bb.jpg", // Charm — Clairo
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f8/6a/3d/f86a3db0-d518-cd49-c0c9-25e767ae0a6d/075679456861.jpg/600x600bb.jpg", // Ready to Die — The Notorious B.I.G.
  "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ab/16/ef/ab16efe9-e7f1-66ec-021c-5592a23f0f9e/17UMGIM88793.rgb.jpg/600x600bb.jpg", // DAMN. — Kendrick Lamar
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8c/20/1f/8c201f03-7617-2d8b-3d8d-e0ba2d55041b/196872123784.jpg/600x600bb.jpg", // Enter the Wu-Tang — Wu-Tang Clan
  "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/36/86/ec/3686ec99-dec4-0a01-8b74-2d8a9a0263a7/12UMGIM52988.rgb.jpg/600x600bb.jpg", // good kid, m.A.A.d city — Kendrick Lamar
];

const COLS = 5; // images are 20% wide → 5 per row

export default function AlbumMosaic() {
  const [fade, setFade] = useState(1);
  const [display, setDisplay] = useState<string[]>(ARTWORKS);

  // Fill out the last row with random albums so it's never a partial row.
  // Done after mount (not during render) to avoid a hydration mismatch.
  useEffect(() => {
    const pad = (COLS - (ARTWORKS.length % COLS)) % COLS;
    if (pad === 0) return;
    const extra = Array.from({ length: pad }, () => ARTWORKS[Math.floor(Math.random() * ARTWORKS.length)]);
    setDisplay([...ARTWORKS, ...extra]);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      // Fully visible at the top, easing out gently over a long scroll (ease-out curve).
      const t = Math.min(1, Math.max(0, window.scrollY / 1400));
      setFade(Math.pow(1 - t, 1.6));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="absolute top-0 left-0 right-0 h-[1500px] overflow-hidden pointer-events-none"
      style={{ opacity: fade, transition: "opacity 0.4s ease-out" }}
      aria-hidden
    >
      {/* Album grid */}
      <div className="flex flex-wrap gap-0 opacity-50">
        {display.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="object-cover"
            style={{ width: "20%", aspectRatio: "1" }}
          />
        ))}
      </div>
      {/* Gradient overlays: gentle fade to bg down the length and on the sides */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/10 via-[#111111]/45 to-[#111111]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/55 via-transparent to-[#111111]/55" />
    </div>
  );
}
