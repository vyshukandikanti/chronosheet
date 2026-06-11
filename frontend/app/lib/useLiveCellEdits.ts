// app/lib/useLiveCellEdits.ts
// ============================
// Real-time cell editing — Phase 5.
//
// When User A types a new value into B5 and presses Enter, every other
// user with the same file open sees B5 change INSTANTLY. The cell
// briefly pulses to draw attention to the change.
//
// Strategy:
// - Each spreadsheet gets a broadcast channel keyed by filename
// - Edits broadcast: "cell:edited" with { row, col, value, author }
// - Receivers update their local state + pulse the cell
//
// Conflict policy (for this phase): last write wins.
// Two users editing the same cell at the same millisecond — whoever's
// broadcast lands last is the final value. That's fine for now;
// Phase 6 (Yjs) brings true conflict-free merging.

"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// Payload of a single cell edit
export type CellEdit = {
  row: number;
  col: number;
  value: string | number | boolean | null;
  author: string;          // Display name of the editor
  editedAt: string;        // ISO timestamp
  sheetName?: string;      // Which sheet within the workbook (multi-sheet support)
};

// Custom event used on the broadcast channel
const EVENT_CELL_EDITED = "cell:edited";

// Build a stable channel name for a given filename
function buildEditsChannel(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet-edits:${safe}`;
}

/**
 * Subscribe to live cell edits for a given filename.
 *
 * @param filename - The file you have open. null = no subscription.
 * @param onCellEdited - Called when ANOTHER user edits a cell on this
 *                       file. NOT echoed for your own edits.
 */
export function useLiveCellEdits(
  filename: string | null,
  onCellEdited: (edit: CellEdit) => void,
) {
  // Keep the callback fresh without forcing re-subscription
  const callbackRef = useRef(onCellEdited);
  useEffect(() => {
    callbackRef.current = onCellEdited;
  }, [onCellEdited]);

  useEffect(() => {
    if (!filename || !isSupabaseReady) return;

    const channelName = buildEditsChannel(filename);
    const channel: RealtimeChannel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: EVENT_CELL_EDITED }, ({ payload }) => {
        if (
          payload &&
          typeof payload === "object" &&
          "row" in payload &&
          "col" in payload
        ) {
          callbackRef.current(payload as CellEdit);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filename]);
}

/**
 * Broadcast a cell edit to other viewers of the same filename.
 * Fire-and-forget — call after you've already updated your local state.
 *
 * Does NOT echo back to yourself.
 */
export async function broadcastCellEdit(
  filename: string,
  edit: CellEdit,
): Promise<void> {
  if (!isSupabaseReady) return;

  const channel = supabase.channel(buildEditsChannel(filename));

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });

  await channel.send({
    type: "broadcast",
    event: EVENT_CELL_EDITED,
    payload: edit,
  });

  await supabase.removeChannel(channel);
}
