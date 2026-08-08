"use client";
import { useEffect } from "react";
import Portal from "@/components/ui/Portal";

interface Props {
  title?: string;
  /** Pick an existing photo. */
  onLibrary: () => void;
  /** Take a new one. Omitted on the web, where there's no camera to open. */
  onCamera?: () => void;
  /** Clear the current picture. Omitted when there isn't one. */
  onRemove?: () => void;
  /** What removing actually does, when "Remove current photo" isn't accurate —
      a crate falls back to its album collage rather than to nothing. */
  removeLabel?: string;
  onClose: () => void;
}

// The choose-a-photo sheet.
//
// Previously the button went straight to the camera plugin's "prompt" source,
// which puts iOS's own two-option sheet on top of ours and leaves no room for
// Remove — so clearing a picture meant hunting for a separate control. This
// asks once, with every option in one place.
export default function PhotoActionSheet({
  title = "Profile picture", onLibrary, onCamera, onRemove, removeLabel, onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const row =
    "w-full text-left px-4 py-3.5 text-[15px] transition-colors active:bg-[#222222]";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-xs m-2 sm:m-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden divide-y divide-[#2e2e2e]">
            <p className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] text-[#6b6b6b]">
              {title}
            </p>

            <button onClick={onLibrary} className={`${row} text-[#f0f0f0]`}>
              Choose from library
            </button>

            {onCamera && (
              <button onClick={onCamera} className={`${row} text-[#f0f0f0]`}>
                Take a photo
              </button>
            )}

            {onRemove && (
              <button onClick={onRemove} className={`${row} text-red-400`}>
                {removeLabel ?? "Remove current photo"}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-2 w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-[#f0f0f0] active:bg-[#222222] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Portal>
  );
}
