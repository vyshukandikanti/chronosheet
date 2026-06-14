// app/lib/useLiveCursors.ts
// ==========================
// Real-time multi-user cursors — Phase 7.
//
// Each user's mouse position is broadcast to other tabs viewing the
// same file. We render colored cursors with the editor's name as a
// label — just like Figma, Notion, Google Docs.
//
// Why this works without spamming the network:
// - We throttle broadcasts to ~25 per second (40ms)
// - We use Supabase Realtime broadcast (no DB writes)
// - Inactive cursors auto-fade after 5 seconds of no movement
//
// Coordinate system:
// - x and y are PERCENTAGES of the viewport (0..100)
// - This adapts somewhat across different screen sizes
// - For a perfectly aligned cursor, you'd use cell coordinates,
//   but viewport % is excellent for a "look like Figma" feel.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// Throttle: don't broadcast cursor more than once every N ms
const BROADCAST_THROTTLE_MS = 40;

// If we haven't heard from a remote cursor in this long, hide it
const STALE_CURSOR_MS = 5000;

// One remote cursor we want to render
export type RemoteCursor = {
  id: string;        // unique per browser tab
  name: string;      // display name to show next to cursor
  color: string;     // hex / tailwind-ish color (we choose one per id)
  x: number;         // percentage of viewport width (0..100)
  y: number;         // percentage of viewport height (0..100)
  updatedAt: number; // Date.now() for staleness check
};

// What we actually put on the wire — minimal
type CursorPayload = {
  id: string;
  name: string;
  x: number;
  y: number;
  // We don't send a color — receivers pick one based on id (consistent)
  // We don't send updatedAt — receivers use their own Date.now()
};

// Cursor color palette — stable per user id
const CURSOR_COLORS = [
  "#10B981", // emerald
  "#8B5CF6", // purple
  "#F472B6", // pink
  "#F59E0B", // amber
  "#0EA5E9", // sky
  "#F43F5E", // rose
  "#A855F7", // violet
  "#14B8A6", // teal
];

function pickColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// Build a stable channel name for a given filename
function buildCursorsChannel(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet-cursors:${safe}`;
}

const EVENT_CURSOR_MOVED = "cursor:moved";

/**
 * Subscribe to remote cursors AND get a broadcast function.
 *
 * @param filename - The file you're viewing. null = no cursors at all.
 * @param myName - Your display name (shown next to your cursor on others' screens)
 * @returns { remoteCursors, broadcastCursor }
 */
export function useLiveCursors(
  filename: string | null,
  myName: string,
): {
  remoteCursors: RemoteCursor[];
  broadcastCursor: (xPct: number, yPct: number) => void;
} {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

  // Stable id for this browser tab
  const myIdRef = useRef<string>("");
  if (!myIdRef.current) {
    myIdRef.current = crypto.randomUUID();
  }

  // The persistent broadcast channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Throttle state for outgoing broadcasts
  const lastBroadcastRef = useRef<number>(0);
  const queuedBroadcastRef = useRef<{ x: number; y: number } | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Subscribe to channel ----------
  useEffect(() => {
    if (!filename || !isSupabaseReady) {
      channelRef.current = null;
      return;
    }

    const channelName = buildCursorsChannel(filename);
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on("broadcast", { event: EVENT_CURSOR_MOVED }, ({ payload }) => {
        const cursor = payload as CursorPayload;
        if (!cursor || cursor.id === myIdRef.current) return;
        setRemoteCursors((prev) => {
          const updated: RemoteCursor = {
            id: cursor.id,
            name: cursor.name || "Guest",
            color: pickColorFor(cursor.id),
            x: cursor.x,
            y: cursor.y,
            updatedAt: Date.now(),
          };
          const without = prev.filter((c) => c.id !== cursor.id);
          return [...without, updated];
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [filename]);

  // ---------- Auto-prune stale cursors every second ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) =>
        prev.filter((c) => now - c.updatedAt < STALE_CURSOR_MS),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Throttled broadcast helper ----------
  const sendNow = useCallback(
    (xPct: number, yPct: number) => {
      const channel = channelRef.current;
      if (!channel) return;
      const payload: CursorPayload = {
        id: myIdRef.current,
        name: myName,
        x: xPct,
        y: yPct,
      };
      channel.send({
        type: "broadcast",
        event: EVENT_CURSOR_MOVED,
        payload,
      });
      lastBroadcastRef.current = Date.now();
    },
    [myName],
  );

  const broadcastCursor = useCallback(
    (xPct: number, yPct: number) => {
      const now = Date.now();
      const elapsed = now - lastBroadcastRef.current;

      if (elapsed >= BROADCAST_THROTTLE_MS) {
        // Send right away
        sendNow(xPct, yPct);
        // Clear any queued send
        queuedBroadcastRef.current = null;
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
      } else {
        // Queue the latest position; flush when throttle window opens
        queuedBroadcastRef.current = { x: xPct, y: yPct };
        if (!flushTimerRef.current) {
          const wait = BROADCAST_THROTTLE_MS - elapsed;
          flushTimerRef.current = setTimeout(() => {
            flushTimerRef.current = null;
            const queued = queuedBroadcastRef.current;
            queuedBroadcastRef.current = null;
            if (queued) sendNow(queued.x, queued.y);
          }, wait);
        }
      }
    },
    [sendNow],
  );

  return { remoteCursors, broadcastCursor };
}
