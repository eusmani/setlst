"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Avatar from "@/components/ui/Avatar";
import { canUseNativeCamera, pickPhoto, tapHaptic } from "@/lib/native";
import PhotoActionSheet from "@/components/ui/PhotoActionSheet";
import PhotoAdjuster from "@/components/ui/PhotoAdjuster";

interface Props {
  username: string;
  initialBio: string | null;
  initialAvatar: string | null;
  initialPhone?: string | null;
  initialEmail?: string | null;
}

// Read an upload as a data URL. Deliberately no resize: the adjuster needs the
// full-resolution photo to crop from, and does the downscale itself.
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EditProfile({ username, initialBio, initialAvatar, initialPhone, initialEmail }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(username);
  const [bio, setBio] = useState(initialBio ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [phone] = useState(initialPhone ?? "");
  const [email] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoSheet, setPhotoSheet] = useState(false);
  // The picked photo, held while it's being framed.
  const [pending, setPending] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please choose an image file"); return; }
    try {
      setPending(await readFile(file));
      setErr("");
    } catch {
      setErr("Could not read that image");
    }
  }

  // Inside the app, go through the native camera / photo picker instead of the
  // web file input — iOS offers "Take Photo" as well as the photo library.
  async function chooseNativePhoto(source: "camera" | "photos") {
    setPhotoSheet(false);
    tapHaptic();
    const pick = await pickPhoto(source);

    if (pick.status === "cancelled") return;
    if (pick.status === "unavailable") { fileRef.current?.click(); return; }
    if (pick.status === "failed") {
      // Say what went wrong. Silence here is what made this look like the
      // feature simply didn't work.
      setErr(`Couldn't use that photo — ${pick.reason}.`);
      return;
    }

    // Straight to the adjuster: cropping happens there, once the framing is set.
    setPending(pick.dataUrl);
    setErr("");
  }

  async function save() {
    setSaving(true); setErr("");
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, avatar, username: name.trim(), phone, email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? "Failed to save"); return; }
    setOpen(false);
    // Push the new avatar to the session so the top-bar pfp updates immediately.
    await update({ avatar });
    if (data.username && data.username !== username) {
      // Username changed: update the session token and move to the new profile URL.
      await update({ username: data.username });
      router.push(`/profile/${data.username}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] px-3 py-1.5 rounded-lg transition-colors"
      >
        Edit profile
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-md bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg text-[#f0f0f0] mb-5">Edit profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <Avatar username={username} avatar={avatar} size={64} />
          <div className="flex flex-col gap-1.5">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button
              onClick={() => setPhotoSheet(true)}
              className="text-xs text-[#f0f0f0] bg-[#222222] border border-[#2e2e2e] hover:border-[#c4a832] px-3 py-1.5 rounded-lg transition-colors"
            >
              {avatar ? "Change photo" : "Add photo"}
            </button>
          </div>
        </div>

        {photoSheet && (
          <PhotoActionSheet
            title="Profile picture"
            onLibrary={() => {
              setPhotoSheet(false);
              // Native goes to the photo picker; the web has only the file input.
              if (canUseNativeCamera()) void chooseNativePhoto("photos");
              else fileRef.current?.click();
            }}
            onCamera={canUseNativeCamera() ? () => void chooseNativePhoto("camera") : undefined}
            onRemove={avatar ? () => { setAvatar(null); setPhotoSheet(false); } : undefined}
            onClose={() => setPhotoSheet(false)}
          />
        )}

        {/* Framing step. Nothing is applied to the avatar until "Use photo",
            so backing out here leaves the existing picture alone. */}
        {pending && (
          <PhotoAdjuster
            src={pending}
            title="Profile picture"
            onDone={(dataUrl) => { setAvatar(dataUrl); setPending(null); }}
            onCancel={() => setPending(null)}
          />
        )}

        {/* Username */}
        <label className="block text-xs text-[#a0a0a0] mb-1.5">Username</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="username"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors mb-1"
        />
        <p className="text-xs text-[#6b6b6b] mb-4">3–20 characters · letters, numbers, underscores</p>

        {/* Bio */}
        <label className="block text-xs text-[#a0a0a0] mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Tell people about your taste in music…"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] resize-none transition-colors"
        />
        <p className="text-right text-xs text-[#6b6b6b] mt-1">{bio.length}/300</p>

        {/* Email & phone — shown below bio */}
        <label className="block text-xs text-[#a0a0a0] mb-1.5 mt-2">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          className="w-full bg-[#1a1a1a] border border-[#1f1f1f] text-[#a0a0a0] rounded-lg px-3 py-2.5 text-sm cursor-not-allowed mb-4"
        />

        <label className="block text-xs text-[#a0a0a0] mb-1.5">Phone number</label>
        <input
          type="tel"
          value={phone}
          readOnly
          disabled
          className="w-full bg-[#1a1a1a] border border-[#1f1f1f] text-[#a0a0a0] rounded-lg px-3 py-2.5 text-sm cursor-not-allowed"
        />

        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setOpen(false)} className="text-sm text-[#a0a0a0] hover:text-[#f0f0f0] px-4 py-2 transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
