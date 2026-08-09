"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Portal from "@/components/ui/Portal";
import { tapHaptic } from "@/lib/native";

interface Props {
  /** The photo as picked, before any cropping. */
  src: string;
  /** Called with the cropped square data URL. */
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
  /** Output edge in px — matches what the API will accept inline. */
  size?: number;
  quality?: number;
  /** Round mask for avatars; square for crate covers. */
  round?: boolean;
  /** Shown in the header. */
  title?: string;
}

const MAX_ZOOM = 4;
/** Room reserved for the header, the zoom slider and the hint line. */
const CHROME = 220;

/**
 * Full-screen pan-and-zoom crop for a picked photo.
 *
 * Photos used to be centre-cropped the instant they were picked, which is fine
 * for a centred subject and wrong for everything else — a face in the top third
 * of a portrait just lost its head. This shows the crop that will actually be
 * saved and lets it be moved and scaled first.
 *
 * The preview is CSS and the output is a canvas draw, so the two have to agree.
 * Everything is kept in viewport pixels and scaled by size/vp once at save time,
 * rather than tracked in two coordinate systems. `vp` is measured rather than
 * fixed, so the crop area fills whatever screen it's on.
 */
export default function PhotoAdjuster({
  src, onDone, onCancel, size = 240, quality = 0.85, round = true, title = "Adjust photo",
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Top-left of the image relative to the crop area, in crop-area px.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  // Edge of the square crop area. Measured, because it fills the screen now.
  const [vp, setVp] = useState(280);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  // Live pointers by id — pinch needs two at once, which one handler can't see.
  const points = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ gap: number; zoom: number; u: number; v: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [touching, setTouching] = useState(false);

  const base = img ? vp / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const shownW = img ? img.width * scale : 0;
  const shownH = img ? img.height * scale : 0;

  // The image must always cover the crop area, so the offsets are bounded.
  const clamp = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(vp - w, x)),
    y: Math.min(0, Math.max(vp - h, y)),
  }), [vp]);

  // Square, as large as the screen allows.
  useEffect(() => {
    const measure = () => setVp(Math.max(200, Math.min(window.innerWidth - 32, window.innerHeight - CHROME)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = src;
  }, [src]);

  // Recentre whenever the photo or the crop size changes — on rotation the old
  // offsets belong to the old frame and would leave the photo off to one side.
  useEffect(() => {
    if (!img) return;
    const b = vp / Math.min(img.width, img.height);
    setZoom(1);
    setPos({ x: (vp - img.width * b) / 2, y: (vp - img.height * b) / 2 });
  }, [img, vp]);

  // Zooming by slider keeps whatever is in the middle in the middle.
  function applyZoom(next: number) {
    if (!img) return;
    const prev = base * zoom;
    const now = base * next;
    const cx = (vp / 2 - pos.x) / prev;
    const cy = (vp / 2 - pos.y) / prev;
    setZoom(next);
    setPos(clamp(vp / 2 - cx * now, vp / 2 - cy * now, img.width * now, img.height * now));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setTouching(true);
    if (points.current.size === 2) startPinch();
    else drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  }

  /**
   * Anchor the pinch: remember the gap between the fingers, and which point of
   * the image sits under their midpoint. Holding that point in place is what
   * makes the photo zoom around the fingers rather than around the frame.
   */
  function startPinch() {
    if (!img) return;
    const [a, b] = [...points.current.values()];
    const box = frame.current?.getBoundingClientRect();
    const local = {
      x: (a.x + b.x) / 2 - (box?.left ?? 0),
      y: (a.y + b.y) / 2 - (box?.top ?? 0),
    };
    pinch.current = {
      gap: Math.hypot(a.x - b.x, a.y - b.y),
      zoom,
      u: (local.x - pos.x) / scale,
      v: (local.y - pos.y) / scale,
    };
    drag.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!img || !points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (points.current.size >= 2 && pinch.current) {
      const [a, b] = [...points.current.values()];
      const p = pinch.current;
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      const next = Math.min(MAX_ZOOM, Math.max(1, p.zoom * (gap / p.gap)));
      const s = base * next;
      // Follow the midpoint too, so a pinch can pan at the same time.
      const box = frame.current?.getBoundingClientRect();
      const mid = {
        x: (a.x + b.x) / 2 - (box?.left ?? 0),
        y: (a.y + b.y) / 2 - (box?.top ?? 0),
      };
      setZoom(next);
      setPos(clamp(mid.x - p.u * s, mid.y - p.v * s, img.width * s, img.height * s));
      return;
    }

    if (!drag.current) return;
    const d = drag.current;
    setPos(clamp(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y), shownW, shownH));
  }

  function onPointerUp(e: React.PointerEvent) {
    points.current.delete(e.pointerId);
    if (points.current.size < 2) pinch.current = null;
    if (points.current.size === 1) {
      // Lifting one finger hands back to a drag from where the other one is,
      // instead of the photo jumping by however far the pinch had moved.
      const [only] = [...points.current.values()];
      drag.current = { x: only.x, y: only.y, ox: pos.x, oy: pos.y };
    } else if (points.current.size === 0) {
      drag.current = null;
      setTouching(false);
    }
  }

  function save() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const k = size / vp; // crop-area px -> output px
    ctx.drawImage(img, pos.x * k, pos.y * k, shownW * k, shownH * k);
    void tapHaptic();
    onDone(canvas.toDataURL("image/jpeg", quality));
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-[#0b0b0b] flex flex-col">
        {/* Header reads like an iOS editor: dismiss left, commit right. */}
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
        >
          <button type="button" onClick={onCancel} className="text-sm text-[#a0a0a0] py-2 pr-3">
            Cancel
          </button>
          <p className="text-sm text-[#f0f0f0]">{title}</p>
          <button
            type="button"
            onClick={save}
            disabled={!img}
            className="text-sm font-semibold text-[#c4a832] py-2 pl-3 disabled:opacity-40"
          >
            Done
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0">
          <div
            ref={frame}
            className="relative overflow-hidden bg-black touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: vp, height: vp, borderRadius: round ? "9999px" : "1rem" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img && (
              <img
                src={src}
                alt=""
                draggable={false}
                style={{ position: "absolute", left: pos.x, top: pos.y, width: shownW, height: shownH, maxWidth: "none" }}
              />
            )}

            {/* Rule-of-thirds guides. Subtle at rest so they don't fight the
                photo, firmer while you're actually moving it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-opacity duration-150"
              style={{ opacity: touching ? 0.75 : 0.3 }}
            >
              {[33.33, 66.66].map((p) => (
                <div key={`h${p}`} className="absolute inset-x-0 border-t border-white/50" style={{ top: `${p}%` }} />
              ))}
              {[33.33, 66.66].map((p) => (
                <div key={`v${p}`} className="absolute inset-y-0 border-l border-white/50" style={{ left: `${p}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div
          className="px-6 shrink-0"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-[#c4a832]"
          />
          <p className="mt-2 text-center text-xs text-[#6b6b6b]">Drag to move, pinch to zoom</p>
        </div>
      </div>
    </Portal>
  );
}
