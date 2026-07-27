// "Share to Instagram Story" — the Letterboxd / Spotify handoff.
//
// Inside the native shell this goes through the InstagramStory plugin
// (ios/App/App/InstagramStoryPlugin.swift), which drops the card on the
// pasteboard and opens `instagram-stories://share`. Instagram's composer comes
// up with the review already placed; the user publishes from there. On the web —
// and on a phone without Instagram — it degrades to the system share sheet and
// finally to just opening the PNG so it can be saved.
import { registerPlugin } from "@capacitor/core";
import { isNative } from "@/lib/native";
import { storyGradient, storyImageUrl, type StoryPayload } from "@/lib/story";

interface InstagramStoryPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  shareToStory(options: {
    stickerImage?: string;
    backgroundImage?: string;
    backgroundTopColor?: string;
    backgroundBottomColor?: string;
    contentURL?: string;
    appID?: string;
  }): Promise<void>;
  shareImage(options: { image: string; title?: string }): Promise<{ completed: boolean }>;
}

const InstagramStory = registerPlugin<InstagramStoryPlugin>("InstagramStory");

// Meta app ID, used as `source_application` so Instagram can attribute the story
// back to SETLST. Optional: without it the composer still opens, just unbranded.
const APP_ID = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";

/** Where a share ended up, so the UI can say something honest afterwards. */
export type ShareOutcome = "instagram" | "shared" | "opened" | "failed";

/** True only in the native shell with Instagram actually installed. */
export async function instagramStoryAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { available } = await InstagramStory.isAvailable();
    return available;
  } catch {
    return false;
  }
}

function absolute(path?: string | null): string | undefined {
  if (!path || typeof window === "undefined") return undefined;
  return new URL(path, window.location.origin).toString();
}

async function fetchImage(url: string): Promise<{ blob: Blob; base64: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Story image failed (${res.status})`);
  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
  return { blob, base64 };
}

export async function shareReviewToInstagramStory(payload: StoryPayload): Promise<ShareOutcome> {
  const link = absolute(payload.path);

  // 1. Native + Instagram installed → straight into the story composer.
  if (await instagramStoryAvailable()) {
    try {
      const { base64 } = await fetchImage(storyImageUrl(payload, "sticker"));
      const { top, bottom } = storyGradient(payload.rating);
      await InstagramStory.shareToStory({
        stickerImage: base64,
        backgroundTopColor: top,
        backgroundBottomColor: bottom,
        contentURL: link,
        appID: APP_ID,
      });
      return "instagram";
    } catch {
      // Fall through — the system share sheet still gets the story posted.
    }
  }

  return shareStoryImage(payload);
}

/** The full-bleed 1080×1920 card, pushed through whatever share surface exists. */
export async function shareStoryImage(payload: StoryPayload): Promise<ShareOutcome> {
  const url = storyImageUrl(payload, "story");
  const title = `${payload.title} — my review on SETLST`;

  try {
    const { blob, base64 } = await fetchImage(url);

    if (isNative()) {
      try {
        await InstagramStory.shareImage({ image: base64, title });
        return "shared";
      } catch {
        /* fall through to the web paths */
      }
    }

    const file = new File([blob], "setlst-review.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title });
      return "shared";
    }
  } catch (err) {
    // A user cancelling the share sheet throws AbortError — not a failure.
    if (err instanceof DOMException && err.name === "AbortError") return "shared";
  }

  try {
    window.open(url, "_blank");
    return "opened";
  } catch {
    return "failed";
  }
}
