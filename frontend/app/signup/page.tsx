// app/signup/page.tsx
// ====================
// The Signup page — users create a new account with email + password.
//
// URL: /signup
// After a successful signup, redirects to home (if email confirmation is off)
// or shows a "check your email" message (if confirmation is on).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseReady } from "../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  // Called when the user submits the form
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseReady) {
      setErrorMessage(
        "Authentication is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Store the display name in user_metadata for later use
        data: { display_name: displayName.trim() || email.split("@")[0] },
      },
    });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // If email confirmation is required, Supabase returns a user but no session.
    if (data.user && !data.session) {
      setNeedsEmailConfirmation(true);
      return;
    }

    // Otherwise we're signed in immediately — go home
    router.push("/");
    router.refresh();
  };

  // ---------- Show "check your email" message after signup ----------
  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">📬</div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-300">
            Check your email!
          </h1>
          <p className="text-slate-300 mb-6">
            We sent a confirmation link to{" "}
            <span className="text-emerald-400 font-medium">{email}</span>.
            <br />
            Click the link to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Default: signup form ----------
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="block text-center mb-8 text-emerald-400 font-bold text-2xl hover:text-emerald-300 transition"
        >
          🟢 ChronoSheet
        </Link>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm mb-6">
            Save snapshots and time-travel through them, forever
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Display name <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Vyshu"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 transition"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Switch to login */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-400"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
