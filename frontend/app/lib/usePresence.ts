// app/lib/usePresence.ts
// =======================
// React hook that broadcasts the current user's presence to other users
// in real time via Supabase Realtime.
//
// PER-SHEET ROOMS:
// Each spreadsheet (by filename) is its own "room". Two users with the
// SAME filename open will see each other. Different filenames = separate
// rooms. No filename = no presence at all.
//
// Example:
//   usePresence("vyshu.xlsx")   → join the vyshu.xlsx room
//   usePresence("sales.xlsx")   → join the sales.xlsx room
//   usePresence(null)           → don't join any room (idle)
//
// When you close the tab, your unmount cleans up — others see you leave.
//
// Behind the scenes, Supabase uses WebSockets to push these events live.
// The same pattern powers "X people viewing this Google Doc" indicators!

"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseReady } from "./supabase";
import { useAuth } from "./AuthProvider";

// Each online user we track
export type OnlineUser = {
  id: string;            // Unique per browser tab
  name: string;          // Display name (or "Guest")
  email?: string;        // Optional — only set if signed in
  joinedAt: string;      // When they joined (ISO timestamp)
  isYou: boolean;        // Are they YOU? (so we can highlight)
};

// Builds the actual channel name from a filename. Replaces spaces and
// special characters to keep it Supabase-channel-safe.
function buildChannelName(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet:${safe}`;
}

/**
 * Subscribe to presence for the given spreadsheet "room".
 *
 * @param channelKey - The filename (or any string) to join. Pass null
 *                    when you don't want to track presence at all.
 */
export function usePresence(channelKey: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    // Skip if there's no channel key, Supabase isn't configured,
    // or auth is still loading
    if (!channelKey || !isSupabaseReady || authLoading) {
      setOnlineUsers([]);
      return;
    }

    // Figure out who WE are
    const myId = crypto.randomUUID();
    const myName =
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "Guest";
    const myEmail = user?.email;

    // Create a channel for THIS specific spreadsheet
    const channelName = buildChannelName(channelKey);
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: myId }, // unique per tab
      },
    });

    // ---------- React to presence events ----------
    channel
      .on("presence", { event: "sync" }, () => {
        // "sync" fires whenever the membership of the channel changes.
        // presenceState() returns: { user_id: [{ ...metadata }], ... }
        const state = channel.presenceState<{
          name: string;
          email?: string;
          joinedAt: string;
        }>();

        // Flatten the state into a clean list of users
        const list: OnlineUser[] = [];
        for (const id of Object.keys(state)) {
          // Each id can have multiple "presences" (e.g. multiple tabs).
          // Take the first one.
          const entry = state[id][0];
          if (!entry) continue;
          list.push({
            id,
            name: entry.name,
            email: entry.email,
            joinedAt: entry.joinedAt,
            isYou: id === myId,
          });
        }
        // Sort: you first, then by join order
        list.sort((a, b) => {
          if (a.isYou) return -1;
          if (b.isYou) return 1;
          return a.joinedAt.localeCompare(b.joinedAt);
        });
        setOnlineUsers(list);
      })
      .subscribe(async (status) => {
        // Once subscribed, announce ourselves to the channel
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: myName,
            email: myEmail,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    // ---------- Cleanup when the component unmounts ----------
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [channelKey, user, authLoading]);

  return onlineUsers;
}
