// app/lib/useLiveSnapshots.ts
// ============================
// Real-time snapshot updates — Phase 4.
//
// When User A saves a snapshot on `vyshu.xlsx`, every other user who
// has `vyshu.xlsx` open sees that snapshot appear in their history
// list INSTANTLY, with no refresh.
//
// How it works:
// 1. Each spreadsheet has its own Supabase Realtime "broadcast" channel
// 2. After a successful save, the saver broadcasts "snapshot:created"
//    with the new snapshot's data
// 3. Every other client listening on that channel receives it and
//    prepends it to their list
// 4. Result: everyone's snapshot history stays in sync
//
// No database replication setup needed — uses Supabase's broadcast
// feature which works out of the box.

"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// The shape of a snapshot as the list panel shows it.
// (Matches what the backend's /save-snapshot returns.)
export type LiveSnapshot = {
  id: string;
  filename: string;
  sheet_name?: string;
  saved_at: string;
  author?: string | null;
  note?: string | null;
  changes_from_previous?: number;
  // Optional full data; usually omitted for "list" broadcasts
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
 * Subscribe to live snapshot events for a given filename.
 *
 * @param filename - The file you're viewing. null = no subscription.
 * @param onSnapshotCreated - Called when ANOTHER user saves a snapshot
 *                            on this file. Use it to update your local list.
 *                            NOTE: Your OWN saves don't echo back — call
 *                            broadcastNewSnapshot() yourself after saving.
 */
export function useLiveSnapshots(
  filename: string | null,
  onSnapshotCreated: (snapshot: LiveSnapshot) => void,
) {
  // Keep the callback fresh without forcing the subscription to tear down
  const callbackRef = useRef(onSnapshotCreated);
  useEffect(() => {
    callbackRef.current = onSnapshotCreated;
  }, [onSnapshotCreated]);

  useEffect(() => {
    if (!filename || !isSupabaseReady) return;

    const channelName = buildEventsChannel(filename);
    const channel: RealtimeChannel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: EVENT_SNAPSHOT_CREATED }, ({ payload }) => {
        // payload is the LiveSnapshot the other user broadcast
        if (payload && typeof payload === "object" && "id" in payload) {
          callbackRef.current(payload as LiveSnapshot);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filename]);
}

/**
 * Broadcast a new snapshot to everyone else on this filename's channel.
 * Call this AFTER you've successfully saved to the backend.
 *
 * Important: this does NOT echo back to YOU — only OTHER subscribers
 * receive it. You should also add the snapshot to your own list locally.
 */
export async function broadcastNewSnapshot(
  filename: string,
  snapshot: LiveSnapshot,
): Promise<void> {
  if (!isSupabaseReady) return;

  const channel = supabase.channel(buildEventsChannel(filename));

  // Wait for the channel to subscribe before sending — otherwise the
  // event is silently dropped.
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });

  await channel.send({
    type: "broadcast",
    event: EVENT_SNAPSHOT_CREATED,
    payload: snapshot,
  });

  // Clean up the temporary channel after sending
  await supabase.removeChannel(channel);
}
