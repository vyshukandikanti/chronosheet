// app/lib/useLiveSnapshots.ts
// ============================
// Real-time snapshot updates — Phase 4.
//
// FIX (v2): Uses ONE persistent channel per file for both sending AND
// receiving. The previous version created separate channels which is
// why broadcasts weren't reliably reaching other tabs.

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// The shape of a snapshot as the list panel shows it.
export type LiveSnapshot = {
  id: string;
  filename: string;
  sheet_name?: string;
  saved_at: string;
  author?: string | null;
  note?: string | null;
  changes_from_previous?: number;
  data?: unknown;
  row_count?: number;
  column_count?: number;
};

// Custom event name used on the broadcast channel
const EVENT_SNAPSHOT_CREATED = "snapshot:created";

// Build a stable channel name for a given filename
function buildEventsChannel(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet-events:${safe}`;
}

/**
 * Subscribe to live snapshot events AND get a broadcast function.
 * One persistent channel for both directions.
 *
 * @param filename - The file you're viewing. null = no subscription.
 * @param onSnapshotCreated - Called when ANOTHER user saves a snapshot.
 * @returns A broadcast function — call after a successful save.
 */
export function useLiveSnapshots(
  filename: string | null,
  onSnapshotCreated: (snapshot: LiveSnapshot) => void,
): (snapshot: LiveSnapshot) => void {
  // Keep the callback fresh without forcing the subscription to tear down
  const callbackRef = useRef(onSnapshotCreated);
  useEffect(() => {
    callbackRef.current = onSnapshotCreated;
  }, [onSnapshotCreated]);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!filename || !isSupabaseReady) {
      channelRef.current = null;
      return;
    }

    const channelName = buildEventsChannel(filename);
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on("broadcast", { event: EVENT_SNAPSHOT_CREATED }, ({ payload }) => {
        console.log("[Phase 4] Received snapshot:", payload);
        if (payload && typeof payload === "object" && "id" in payload) {
          callbackRef.current(payload as LiveSnapshot);
        }
      })
      .subscribe((status) => {
        console.log(`[Phase 4] Snapshot channel "${channelName}" status:`, status);
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [filename]);

  // The broadcast function uses the persistent channel
  const broadcast = useCallback((snapshot: LiveSnapshot) => {
    const channel = channelRef.current;
    if (!channel) {
      console.warn("[Phase 4] Tried to broadcast but channel not ready yet");
      return;
    }
    console.log("[Phase 4] Broadcasting new snapshot:", snapshot);
    channel.send({
      type: "broadcast",
      event: EVENT_SNAPSHOT_CREATED,
      payload: snapshot,
    });
  }, []);

  return broadcast;
}

// Legacy export kept for compatibility — but call the returned function
// from useLiveSnapshots instead. This stays here so existing imports work.
export async function broadcastNewSnapshot(
  _filename: string,
  _snapshot: LiveSnapshot,
): Promise<void> {
  console.warn(
    "[Phase 4] broadcastNewSnapshot() is deprecated. Use the function returned by useLiveSnapshots() instead.",
  );
}
