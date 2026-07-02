"use client";
// Client-side image helpers for discussion attachments: downscale to a JPEG data
// URL (no external storage, mirrors avatars/crate covers) and SFW moderation via
// nsfwjs so nothing explicit gets posted.

export async function resizeToDataUrl(file: File, max = 1200, quality = 0.8): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  if (width > max || height > max) {
    const scale = max / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// Lazily-loaded nsfwjs model (heavy — only pulled the first time someone attaches).
let modelPromise: Promise<import("nsfwjs").NSFWJS> | null = null;
async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const nsfwjs = await import("nsfwjs");
      return nsfwjs.load(); // default MobileNetV2 (cached in IndexedDB after first load)
    })();
  }
  return modelPromise;
}

export interface SfwResult { safe: boolean; scores: Record<string, number> }

// Returns whether the image is safe-for-work. Throws if the classifier can't run
// (callers fail closed — an unverifiable image is not attached).
export async function moderateImage(dataUrl: string): Promise<SfwResult> {
  const img = await loadImage(dataUrl);
  const model = await getModel();
  const preds = await model.classify(img);
  const s: Record<string, number> = {};
  for (const p of preds) s[p.className] = p.probability;
  const safe = (s.Porn ?? 0) < 0.4 && (s.Hentai ?? 0) < 0.4 && (s.Sexy ?? 0) < 0.65;
  return { safe, scores: s };
}
