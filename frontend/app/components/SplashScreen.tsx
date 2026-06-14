// app/components/SplashScreen.tsx
// ================================
// Animated intro shown on every page load (including refresh).
//
// Sequence (3 seconds total):
//  0.0s: Logo pops in (scale + fade)
//  0.3s: CHRONOSHEET title types in
//  0.9s: Tagline fades up
//  1.4s: Loading dots appear and pulse
//  2.5s: Whole splash fades out

"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    // Phase timing — each phase reveals one piece
    const t1 = setTimeout(() => setPhase(1), 300);   // title types in
    const t2 = setTimeout(() => setPhase(2), 900);   // tagline appears
    const t3 = setTimeout(() => setPhase(3), 1400);  // dots pulse
    const tFade = setTimeout(() => setFadeOut(true), 2500);
    const tDone = setTimeout(() => {
      setShow(false);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity duration-700 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Glowing background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-purple-500/20 blur-3xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo (animated pop-in) */}
        <div className="animate-splash-logo-in">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/40">
            <svg
              viewBox="0 0 32 32"
              className="h-14 w-14 text-white"
              fill="currentColor"
            >
              {/* Grid pattern — matches ChronoSheet brand */}
              <rect x="4" y="4" width="9" height="9" rx="1.5" />
              <rect x="15" y="4" width="9" height="9" rx="1.5" />
              <rect x="4" y="15" width="9" height="9" rx="1.5" opacity="0.6" />
              <rect x="15" y="15" width="9" height="9" rx="1.5" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Title — appears at phase 1 */}
        <h1
          className={`mt-8 text-5xl font-bold tracking-tight transition-all duration-700 sm:text-6xl ${
            phase >= 1
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-purple-400 bg-clip-text text-transparent">
            ChronoSheet
          </span>
        </h1>

        {/* Tagline — appears at phase 2 */}
        <p
          className={`mt-3 text-base font-medium text-slate-400 transition-all duration-700 sm:text-lg ${
            phase >= 2
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          Spreadsheets That Remember.
        </p>

        {/* Loading dots — appear at phase 3 */}
        <div
          className={`mt-10 flex items-center gap-2 transition-opacity duration-500 ${
            phase >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-splash-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-splash-dot"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-splash-dot"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        {/* Subtle "powered by" footer */}
        <p
          className={`mt-12 text-xs text-slate-600 transition-opacity duration-700 ${
            phase >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          ✨ Powered by Raft consensus and Artificial Intelligence
        </p>
      </div>

      {/* Inline keyframes — kept here so the file is self-contained */}
      <style jsx>{`
        @keyframes splashLogoIn {
          0% {
            transform: scale(0.6) rotate(-8deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.1) rotate(2deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }
        :global(.animate-splash-logo-in) {
          animation: splashLogoIn 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes splashDot {
          0%,
          80%,
          100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        :global(.animate-splash-dot) {
          animation: splashDot 1s ease-in-out infinite both;
        }
      `}</style>
    </div>
  );
}
