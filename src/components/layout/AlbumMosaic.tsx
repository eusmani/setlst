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
  "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/b5/a6/91/b5a69171-5232-3d5b-9c15-8963802f83dd/15UMGIM15814.rgb.jpg/600x600bb.jpg", // To Pimp a Butterfly — Kendrick Lamar
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/37/da/7c/37da7cc5-2b6f-9bb8-30ba-8a8c3be3e16a/00602527584973.rgb.jpg/600x600bb.jpg", // My Beautiful Dark Twisted Fantasy — Kanye West
  "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/39/25/2d/39252d65-2d50-b991-0962-f7a98a761271/00602517483507.rgb.jpg/600x600bb.jpg", // Graduation — Kanye West
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/4d/75/2d/4d752db1-022d-f65d-40a1-a2390f01427a/13UAEIM26465.rgb.jpg/600x600bb.jpg", // 808s & Heartbreak — Kanye West
  "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/15/05/09/15050911-a2f1-9ebc-0d16-6e8faad1cf80/00602567924326.rgb.jpg/600x600bb.jpg", // The College Dropout — Kanye West
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0a/02/f7/0a02f7a1-ca2a-c0d7-7192-50314971721f/884977157031.jpg/600x600bb.jpg", // Born to Run — Bruce Springsteen
  "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/eb/1f/12/eb1f12ec-474c-63aa-43af-09282f423b9d/00602537004737.rgb.jpg/600x600bb.jpg", // Songs in the Key of Life — Stevie Wonder
  "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/76/36/2d/76362d74-cb7a-8ef9-104e-cde1d858e9a9/20UMGIM95279.rgb.jpg/600x600bb.jpg", // What's Going On — Marvin Gaye
  "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/35/bb/c4/35bbc4eb-9387-97b0-b138-64b7a949ea43/13UABIM03512.rgb.jpg/600x600bb.jpg", // Pet Sounds — The Beach Boys
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/88/16/2c/88162c3d-46db-8321-61f3-3a47404cfe76/075596050920.jpg/600x600bb.jpg", // Hotel California — Eagles
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/1e/14/58/1e145814-281a-58e0-3ab1-145f5d1af421/886443673441.jpg/600x600bb.jpg", // Back In Black — AC/DC
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/89/4a/4a/894a4ab9-b0b0-9ea5-ca41-8da0b9b79453/14UMDIM03405.rgb.jpg/600x600bb.jpg", // 1989 — Taylor Swift
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8c/ef/c2/8cefc23a-61b7-05ff-b52a-bb1e4922087c/20UMGIM64216.rgb.jpg/600x600bb.jpg", // folklore — Taylor Swift
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d2/53/65/d2536587-c7f3-9153-4677-f5a2f3e9e5ad/886447691120.jpg/600x600bb.jpg", // Lemonade — Beyoncé
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2b/b9/fe/2bb9fef5-d7f3-8345-25a9-db0e79fde4e4/20UMGIM11048.rgb.jpg/600x600bb.jpg", // After Hours — The Weeknd
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/69/9c/b5/699cb5d6-115c-ff73-9d26-e57ea4350d72/887828031795.png/600x600bb.jpg", // AM — Arctic Monkeys
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/9c/ae/7a/9cae7a72-29ed-08aa-1b42-913776bbb6ec/886443855571.jpg/600x600bb.jpg", // Comedown Machine — The Strokes
  "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/bd/8e/13/bd8e1358-b367-a689-cb84-cebd0b067dc4/634904078263.png/600x600bb.jpg", // Kid A — Radiohead
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg", // Random Access Memories — Daft Punk
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f8/ff/c0/f8ffc056-55b4-2033-657d-32492d1eea25/827969239926.jpg/600x600bb.jpg", // Highway 61 Revisited — Bob Dylan
  "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/e5/24/aa/e524aacd-467b-66f3-8931-0fcd6750a4b9/08UMGIM07914.rgb.jpg/600x600bb.jpg", // A Love Supreme — John Coltrane
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/09/6b/55/096b55c4-ee8f-23bd-df8f-0ca0821f3028/886446727189.jpg/600x600bb.jpg", // The Miseducation of Lauryn Hill — Lauryn Hill
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0e/48/dd/0e48dd9a-07c9-46de-a838-b4ddb4e508a7/886448814191.jpg/600x600bb.jpg", // Aquemini — Outkast
  "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/d6/21/fb/d621fbde-c099-6794-7102-2692f10c4dbb/886448814283.jpg/600x600bb.jpg", // Stankonia — Outkast
  "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/ea/ac/03/eaac03e5-8e9d-847e-d5b9-af7dee6a970b/00606949063221.rgb.jpg/600x600bb.jpg", // The Marshall Mathers LP — Eminem
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/53/62/d2536245-b94c-b3fd-7168-9512f655f6d4/00602527899091.rgb.jpg/600x600bb.jpg", // Take Care — Drake
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a2/bc/ad/a2bcad46-b389-4be1-8bac-5a0959b0b8e4/886446548449.jpg/600x600bb.jpg", // Ctrl — SZA
  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/02/ed/8c/02ed8cab-c089-2fdd-7ce6-ab334a9a4e19/21UMGIM26093.rgb.jpg/600x600bb.jpg", // SOUR — Olivia Rodrigo
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/02/b7/6d/02b76dd3-4006-bc65-9f33-33b70a95222a/21UMGIM36684.rgb.jpg/600x600bb.jpg", // Happier Than Ever — Billie Eilish
  "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg", // Harry's House — Harry Styles
  "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/08/8c/24/088c2405-2e33-801b-5c38-e967f2c01e69/191404113974.png/600x600bb.jpg", // 25 — Adele
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2b/09/6e/2b096e8c-ae65-fc42-a4b1-19abb4100433/886446576442.jpg/600x600bb.jpg", // Funeral — Arcade Fire
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ea/9f/1a/ea9f1ab0-4cac-c925-590d-14461f676912/886446576510.jpg/600x600bb.jpg", // The Suburbs — Arcade Fire
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e7/49/8f/e7498f65-df8f-bead-d6e3-2a8d4d642a79/886447235317.jpg/600x600bb.jpg", // ASTROWORLD — Travis Scott
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/6d/fb/f1/6dfbf17d-4032-f585-35ad-f3f9b6859cd9/886445460421.jpg/600x600bb.jpg", // Rodeo — Travis Scott
  "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg", // Discovery — Daft Punk
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/20/9d/bf/209dbf58-f698-7181-33de-0c29480beba0/074640084126.jpg/600x600bb.jpg", // Blonde On Blonde — Bob Dylan
  "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/6e/56/af/6e56af83-bdff-56c2-7c6a-b30cd0d356ce/06UMGIM08757.rgb.jpg/600x600bb.jpg", // Get Rich or Die Tryin' — 50 Cent
];

// Every album appears at most once — no duplicates on the mural. The curated set
// is large enough to fill the backdrop (4 covers per row on mobile, 5 at sm+).
const UNIQUE = [...new Set(ARTWORKS)];

export default function AlbumMosaic() {
  const [fade, setFade] = useState(1);
  const [display, setDisplay] = useState<string[]>(UNIQUE);

  // Shuffle after mount for variety (client-only → no hydration mismatch).
  useEffect(() => {
    const arr = [...UNIQUE];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setDisplay(arr);
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
            // Apple serves any size from the same URL. These tiles render about
            // 98px wide on a phone, sit at 50% opacity behind two gradients, and
            // there are 65 of them — 600px covers meant a 6.3 MB background
            // image for decoration nobody looks at directly. 300px is still
            // sharp at 3x on the widest tile.
            src={src.replace("/600x600bb.jpg", "/300x300bb.jpg")}
            alt=""
            loading="lazy"
            decoding="async"
            className="object-cover aspect-square w-1/4 sm:w-1/5"
          />
        ))}
      </div>
      {/* Gradient overlays: gentle fade to bg down the length and on the sides */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/10 via-[#111111]/45 to-[#111111]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/55 via-transparent to-[#111111]/55" />
    </div>
  );
}
