"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function DeleteAccountPage() {
  const { data: session, status } = useSession();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (status !== "loading" && !session) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#a0a0a0] text-sm">
          <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to manage your account.
        </p>
      </div>
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleting(false);
      alert("Could not delete your account. Please try again.");
    }
  }

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <div className="max-w-md mx-auto px-5 py-12">
      <Link href="/settings" className="text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors mb-6 block">
        ← Back to settings
      </Link>

      <div className="bg-[#1a1a1a] border border-red-500/40 rounded-xl p-5">
        <h1 className="text-lg text-[#f0f0f0] mb-2">Delete account</h1>
        <p className="text-sm text-[#a0a0a0] mb-4 leading-relaxed">
          This permanently removes your profile, reviews, comments, likes, followed artists and
          listen list. This <span className="text-red-400">cannot be undone</span>.
        </p>

        <label className="block text-xs text-[#6b6b6b] mb-2">
          Type <span className="text-[#d8d8d8] font-semibold">DELETE</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 placeholder-[#6b6b6b] mb-4"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={deleteAccount}
            disabled={!canDelete || deleting}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {deleting ? "Deleting…" : "Permanently delete my account"}
          </button>
          <Link
            href="/settings"
            className="border border-[#2e2e2e] hover:border-[#555] text-[#a0a0a0] px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
