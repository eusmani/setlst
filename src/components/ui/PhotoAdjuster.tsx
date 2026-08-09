"use client";
import { useEffect, useRef, useState } from "react";
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
}

const VIEWPORT = 260; // CSS px of the visible crop area
const MAX_ZOOM = 4;

/**
 * Pan-and-zoom crop for a picked photo.
 *
 * Photos used to be centre-cropped the instant they were picked, which is fine
 * for a centred subject and wrong for everything else — a face in the top third
 * of a portrait just lost its head. This shows the crop that will actually be
 * saved and lets it be moved and scaled first.
 *
 * The preview is a CSS transform and the output is drawn on a canvas, so the
 * two have to agree: everything is kept in viewport pixels and scaled by
 * size/VIEWPORT at the end, rather than tracked in two coordinate systems.
 */
export default function PhotoAdjuster({
  src, onDone, onCancel, size = 240, quality = 0.85, round = true,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Top-left of the image relative to the viewport, in viewport px.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  // Live pointers by id — pinch needs two at once, which a single handler can't see.
  const points = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ gap: number; zoom: number; u: number; v: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [touching, setTouching] = useState(false);

  // `cover` scale: the smaller edge exactly fills the viewport at zoom 1.
  const base = img ? VIEWPORT / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const shownW = img ? img.width * scale : 0;
  const shownH = img ? img.height * scale : 0;

  // The image must always cover the viewport, so the offsets are bounded.
  function clamp(x: number, y: number, w: number, h: number) {
    return {
      x: Math.min(0, Math.max(VIEWPORT - w, x)),
      y: Math.min(0, Math.max(VIEWPORT - h, y)),
    };
  }

  useEffect(() => {
    const el = new Image();
    el.onload = () => {
      const b = VIEWPORT / Math.min(el.width, el.height);
      setImg(el);
      setPos({ x: (VIEWPORT - el.width * b) / 2, y: (VIEWPORT - el.height * b) / 2 });
    };
    el.src = src;
  }, [src]);

  // Zooming keeps whatever is under the middle of the viewport in the middle,
  // instead of pulling the subject toward the corner.
  function applyZoom(next: number) {
    if (!img) return;
    const prev = base * zoom;
    const now = base * next;
    const cx = (VIEWPORT / 2 - pos.x) / prev;
    const cy = (VIEWPORT / 2 - pos.y) / prev;
    setZoom(next);
    setPos(clamp(VIEWPORT / 2 - cx * now, VIEWPORT / 2 - cy * now, img.width * now, img.height * now));
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
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const box = frame.current?.getBoundingClientRect();
    const local = { x: mid.x - (box?.left ?? 0), y: mid.y - (box?.top ?? 0) };
    pinch.current = {
      gap: Math.hypot(a.x - b.x, a.y - b.y),
      zoom,
      // Where the midpoint falls on the image itself, in image pixels.
      u: (local.x - pos.x) / scale,
      v: (local.y - pos.y) / scale,
    };
    drag.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!img) return;
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (points.current.size >= 2 && pinch.current) {
      const [a, b] = [...points.current.values()];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      const p = pinch.current;
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
    const k = size / VIEWPORT; // viewport px -> output px
    ctx.drawImage(img, pos.x * k, pos.y * k, shownW * k, shownH * k);
    void tapHaptic();
    onDone(canvas.toDataURL("image/jpeg", quality));
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-[#161616] border border-[#2e2e2e] rounded-2xl p-5">
          <p className="text-sm text-[#f0f0f0] mb-1">Adjust photo</p>
          <p className="text-xs text-[#6b6b6b] mb-4">Drag to move, pinch to zoom.</p>

          <div
            ref={frame}
            className="relative mx-auto overflow-hidden bg-[#0c0c0c] touch-none select-none cursor-grab active:cursor-grabbing"
            style={{
              width: VIEWPORT,
              height: VIEWPORT,
              borderRadius: round ? "9999px" : "0.75rem",
            }}
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
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: shownW,
                  height: shownH,
                  maxWidth: "none",
                }}
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

          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full mt-4 accent-[#c4a832]"
          />

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-sm text-[#a0a0a0]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!img}
              className="flex-1 py-2.5 rounded-xl bg-[#c4a832] text-[#111111] text-sm font-semibold disabled:opacity-50"
            >
              Use photo
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
