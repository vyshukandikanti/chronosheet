// app/components/AuthBadge.tsx
// =============================
// Small widget shown in the header — adapts to login state.
//
// Logged out: shows "Sign in" + "Sign up" links
// Logged in:  shows user name/email + dropdown with "Sign out"

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";

export default function AuthBadge() {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!menuOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [menuOpen]);

  // While Supabase is figuring out the session, show a quiet placeholder
  if (loading) {
    return (
      <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
    );
  }

  // ---------- Not signed in ----------
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 font-medium text-slate-300 hover:text-emerald-300 hover:bg-slate-800 transition"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 font-semibold text-white transition"
        >
          Sign up
        </Link>
      </div>
    );
  }

  // ---------- Signed in ----------
  // Try to show display name, then fall back to email
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "You";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpen(false);

    // NUCLEAR OPTION: clear every trace of the auth session ourselves,
    // then hard-reload. We do not await anything — this MUST succeed
    // even if the Supabase signOut call hangs.
    if (typeof window !== "undefined") {
      // 1. Wipe every Supabase localStorage key (they all start with "sb-")
      try {
        const localKeys = Object.keys(window.localStorage);
        localKeys.forEach((key) => {
          if (
            key.startsWith("sb-") ||
            key.toLowerCase().includes("supabase")
          ) {
            window.localStorage.removeItem(key);
          }
        });
        // Also nuke session storage just in case
        window.sessionStorage.clear();
      } catch {
        // ignore — we'll still force the reload
      }

      // 2. Fire-and-forget the Supabase API sign-out (sends a request
      //    to invalidate the refresh token on the server side).
      signOut().catch(() => {});

      // 3. Force a hard reload to the landing page. This guarantees the
      //    UI shows the signed-out state — no more being "stuck signed in".
      window.location.replace("/");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 px-2 py-1 transition border border-slate-700"
      >
        {/* Avatar (initial circle) */}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden sm:inline text-xs text-slate-200 pr-1">
          {displayName}
        </span>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 z-[80] w-56 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-200">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-red-300 transition rounded-b-lg disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
