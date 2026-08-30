"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import clsx from "clsx";

/**
 * Signs out by asking the server to clear the session cookie — the cookie is
 * httpOnly, so it cannot be cleared from here. `refresh()` then drops the
 * cached React tree, so the next render has no account data in it.
 */
export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className={clsx(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
        "text-text-secondary transition-colors duration-150",
        "hover:bg-text-primary/[0.04] hover:text-text-primary disabled:opacity-60",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
