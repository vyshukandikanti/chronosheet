// app/components/LiveCursors.tsx
// ================================
// Renders the floating cursors of OTHER users (not yours) on top of
// the whole page. Each cursor shows their name in a colored label.
//
// Looks exactly like Figma / Google Docs / Notion collaborative cursors.

"use client";

import type { RemoteCursor } from "../lib/useLiveCursors";

type Props = {
  cursors: RemoteCursor[];
};

export default function LiveCursors({ cursors }: Props) {
  if (cursors.length === 0) return null;

  return (
    // Fixed-position overlay covering the whole viewport.
    // pointer-events-none lets all clicks pass through to whatever is below.
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    >
      {cursors.map((cursor) => (
        <div
          key={cursor.id}
          className="absolute transition-transform duration-75 ease-linear"
          style={{
            // Position the cursor at the broadcasted percentage of the viewport
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: "translate(-2px, -2px)",
          }}
        >
          {/* Cursor arrow (SVG, like Figma's) */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
          >
            <path
              d="M5 3 L5 19 L9 15 L11.5 21 L14 20 L11.5 14 L17 14 Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>

          {/* Name label */}
          <div
            className="ml-3 mt-0.5 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold text-white shadow-md"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  );
}
