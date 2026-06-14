// app/lib/useLiveCellEdits.ts
// ============================
// Real-time cell editing — Phase 5.
//
// When User A types a new value into B5 and presses Enter, every other
// user with the same file open sees B5 change INSTANTLY.
//
// FIX (v2): Uses ONE persistent channel per file for both sending AND
// receiving. The previous version created separate channels which is
// why broadcasts weren't reaching other tabs.

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// Payload of a single cell edit
export type CellEdit = {
  row: number;
  col: number;
  value: string | number | boolean | null;
  author: string;          // Display name of the editor
  editedAt: string;        // ISO timestamp
  sheetName?: string;      // Which sheet within the workbook
};

// Custom event used on the broadcast channel
const EVENT_CELL_EDITED = "cell:edited";

// Build a stable channel name for a given filename
function buildEditsChannel(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet-edits:${safe}`;
}

/**
 * Subscribe to live cell edits AND get a broadcast function.
 * One persistent channel for both directions.
 *
 * @param filename - The file you have open. null = no subscription.
 * @param onCellEdited - Called when ANOTHER user edits a cell.
 * @returns A broadcast function — call it to send your edit to others.
 */
export function useLiveCellEdits(
  filename: string | null,
  onCellEdited: (edit: CellEdit) => void,
): (edit: CellEdit) => void {
  // Keep the callback fresh without forcing re-subscription
  const callbackRef = useRef(onCellEdited);
  useEffect(() => {
    callbackRef.current = onCellEdited;
  }, [onCellEdited]);

  // Keep the channel in a ref so the broadcast function can use it
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!filename || !isSupabaseReady) {
      channelRef.current = null;
      return;
    }

    const channelName = buildEditsChannel(filename);
    // IMPORTANT: pass config so broadcast self-echo is OFF (default).
    // Without this, your own broadcasts might come back to you.
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on("broadcast", { event: EVENT_CELL_EDITED }, ({ payload }) => {
        console.log("[Phase 5] Received cell edit:", payload);
        if (
          payload &&
          typeof payload === "object" &&
          "row" in payload &&
          "col" in payload
        ) {
          callbackRef.current(payload as CellEdit);
        }
      })
      .subscribe((status) => {
        console.log(`[Phase 5] Channel "${channelName}" status:`, status);
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
  const broadcast = useCallback((edit: CellEdit) => {
    const channel = channelRef.current;
    if (!channel) {
      console.warn("[Phase 5] Tried to broadcast but channel not ready yet");
      return;
    }
    console.log("[Phase 5] Broadcasting cell edit:", edit);
    channel.send({
      type: "broadcast",
      event: EVENT_CELL_EDITED,
      payload: edit,
    });
  }, []);

  return broadcast;
}
