// app/components/LeaderModeToggle.tsx
// =====================================
// Leader Mode toggle button + "How it works" modal.
//
// Renders:
//   - A toggle: free edit ↔ leader mode
//   - When ON: a "👑 [Leader name] is leading" badge for followers
//   - Always: an "ℹ️ How it works" button that opens a modal

"use client";

import { useState } from "react";

type Props = {
  // Are we in leader mode (someone has claimed leadership)?
  active: boolean;
  // Are YOU the leader?
  isLeader: boolean;
  // Display name of the current leader (only used when active)
  leaderName: string | null;
  // Actions
  onClaim: () => void;
  onRelease: () => void;
};

export default function LeaderModeToggle({
  active,
  isLeader,
  leaderName,
  onClaim,
  onRelease,
}: Props) {
  const [showInfo, setShowInfo] = useState(false);

  const handleClick = () => {
    if (active && isLeader) {
      onRelease();
    } else if (!active) {
      onClaim();
    }
    // If someone ELSE is the leader, clicking the toggle does nothing
    // (you can't steal control). They have to release first.
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Main toggle button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={active && !isLeader}
          title={
            active && !isLeader
              ? `${leaderName} is in control. Wait for them to release.`
              : active
              ? "You are the leader. Click to release."
              : "Click to lock the file and become the leader."
          }
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            active
              ? isLeader
                ? "border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                : "border-amber-400/40 bg-amber-500/10 text-amber-300 cursor-not-allowed"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
          }`}
        >
          {active ? (
            <>
              <span>👑</span>
              <span>
                {isLeader ? "You are leading" : `${leaderName} is leading`}
              </span>
            </>
          ) : (
            <>
              <span>🔓</span>
              <span>Free Edit</span>
            </>
          )}
        </button>

        {/* How it works info button */}
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          title="How does Leader Mode work?"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 transition"
        >
          ℹ️
        </button>
      </div>

      {/* "How it works" modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>👑</span>
                  <span>Leader Mode — How it works</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Inspired by the Raft consensus algorithm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-md p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 text-sm text-slate-300">
              <section>
                <h3 className="font-semibold text-emerald-300 mb-1">
                  🔓 Default: Free Edit Mode
                </h3>
                <p>
                  Everyone on this file can edit any cell at any time.
                  Like Google Sheets. Great for brainstorming and team work.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-300 mb-1">
                  👑 Leader Mode (when toggled ON)
                </h3>
                <p>
                  The person who toggles ON becomes the <b>Leader</b>.
                  Everyone else becomes a <b>Follower</b> (read-only).
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-200 mb-2">
                  When to use Leader Mode:
                </h3>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                  <li>🎤 Presenting the sheet to a client</li>
                  <li>📊 Reviewing data with your team</li>
                  <li>🔒 Finalizing numbers before submission</li>
                  <li>📺 Demoing the app</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-slate-200 mb-2">
                  What Leaders can do:
                </h3>
                <ul className="space-y-1.5 list-disc list-inside text-emerald-300/90">
                  <li>Edit cells, add rows, delete rows</li>
                  <li>Save snapshots</li>
                  <li>Export the file</li>
                  <li>Release leadership at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-slate-200 mb-2">
                  What Followers can do:
                </h3>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                  <li>View the spreadsheet in real time</li>
                  <li>See live cursors and edits as they happen</li>
                  <li>Use AI chat, charts, search — all view-only</li>
                  <li>Wait for the leader to release</li>
                </ul>
              </section>

              <section className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <h3 className="font-semibold text-slate-200 mb-1 text-xs">
                  ⏱️ Auto-recovery
                </h3>
                <p className="text-xs text-slate-400">
                  If the leader closes their tab without releasing, leadership
                  automatically expires after 9 seconds. The file goes back
                  to free-edit mode.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
