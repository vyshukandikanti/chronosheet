// app/lib/usePresence.ts
// =======================
// React hook that broadcasts the current user's presence to other users
// in real time via Supabase Realtime.
//
// What it does:
// - When you mount this hook, it joins a "presence channel" on Supabase
// - It tells the channel "I'm online! Here's my name + avatar info"
// - It listens for OTHER users joining or leaving the channel
// - Returns the list of everyone currently online (including you)
//
// When you close the tab, your unmount cleans up — others see you leave.
//
// Behind the scenes, Supabase uses WebSockets to push these events live.
// The same pattern powers "X people are viewing this product" on Amazon!

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

// The channel name — everyone on the app joins the same channel.
// Later (Phase 4+) we'll have per-document channels for shared editing.
const GLOBAL_CHANNEL = "chronosheet-global-presence";

export function usePresence() {
  const { user, loading: authLoading } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    // Skip if Supabase isn't configured or auth is still loading
    if (!isSupabaseReady || authLoading) return;

    // Figure out who WE are
    const myId = crypto.randomUUID();
    const myName =
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "Guest";
    const myEmail = user?.email;

    // Create a channel — everyone using this same key sees each other
    const channel = supabase.channel(GLOBAL_CHANNEL, {
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
  }, [user, authLoading]);

  return onlineUsers;
}
