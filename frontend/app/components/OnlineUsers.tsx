// app/components/OnlineUsers.tsx
// ================================
// Shows a row of avatars for everyone currently using ChronoSheet.
// Each avatar = one user (or guest tab). Hover for the name.
//
// This is the "social proof" element — visitors see "real people are
// here right now" which builds trust and excitement!

"use client";

import { useState } from "react";
import { usePresence, type OnlineUser } from "../lib/usePresence";

// Pick a consistent color for each user based on their name
// (Same name → same color, every time. Stable across renders.)
const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-teal-500",
];

function getColorForUser(user: OnlineUser): string {
  if (user.isYou) return "bg-emerald-500";
  // Hash the name to pick a stable color
  let hash = 0;
  for (let i = 0; i < user.name.length; i++) {
    hash = (hash * 31 + user.name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Maximum number of avatars to show before collapsing into "+N more"
const MAX_AVATARS = 5;

export default function OnlineUsers() {
  const onlineUsers = usePresence();
  const [showAll, setShowAll] = useState(false);

  // If presence isn't ready or nobody is online (shouldn't happen for "you"),
  // don't render anything yet
  if (onlineUsers.length === 0) return null;

  const visibleUsers = showAll ? onlineUsers : onlineUsers.slice(0, MAX_AVATARS);
  const hiddenCount = onlineUsers.length - visibleUsers.length;

  return (
    <div className="flex items-center gap-2">
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => {
          const initial = user.name.charAt(0).toUpperCase() || "?";
          const color = getColorForUser(user);
          return (
            <div
              key={user.id}
              title={user.isYou ? `${user.name} (you)` : user.name}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 ${color} text-xs font-bold text-white shadow ${
                user.isYou ? "ring-2 ring-emerald-400" : ""
              }`}
            >
              {initial}
              {/* Live green dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-slate-900 bg-emerald-400" />
            </div>
          );
        })}

        {/* "+N more" bubble */}
        {hiddenCount > 0 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-[10px] font-bold text-slate-200 shadow hover:bg-slate-600 transition"
            title="Show all online users"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {/* Count label */}
      <span className="hidden sm:inline text-xs text-slate-400">
        {onlineUsers.length === 1
          ? "Just you"
          : `${onlineUsers.length} online`}
      </span>
    </div>
  );
}
