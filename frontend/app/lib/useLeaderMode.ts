// app/lib/useLeaderMode.ts
// =========================
// Leader Mode — Phase 8 (optional Raft-style lock).
//
// Anyone can toggle Leader Mode ON for the current file. When ON:
//   - The toggler becomes the LEADER
//   - All other users on the same file become FOLLOWERS (read-only)
//   - Followers see "👑 Vyshu is leading" and edit buttons are disabled
//
// When OFF, free-edit collaboration resumes (Phase 5 default).
//
// State is broadcast over Supabase Realtime so every tab agrees on
// who the leader is. If the leader closes their tab, the state
// auto-expires after a few seconds and the file reverts to free mode.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

export type LeaderState = {
  leaderId: string | null;   // tab id of the leader
  leaderName: string | null; // display name shown on the badge
  takenAt: number;           // Date.now() when leadership was claimed
};

// Re-broadcast our leadership claim every few seconds so late-joining
// tabs catch up, and so a dead leader's state can expire.
const HEARTBEAT_INTERVAL_MS = 3000;
const LEADER_STALE_MS = 9000; // 3 missed heartbeats = stale

const EVENT_LEADER_CLAIM = "leader:claim";
const EVENT_LEADER_RELEASE = "leader:release";

function buildLeaderChannel(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_");
  return `sheet-leader:${safe}`;
}

/**
 * Subscribe to / control leader mode for a file.
 *
 * @returns
 *   leader: current leader state (or null = free mode)
 *   isLeader: are YOU the leader?
 *   isLocked: is the file in leader mode AND you're NOT the leader?
 *   claim: become the leader
 *   release: step down (free mode resumes)
 */
export function useLeaderMode(filename: string | null, myName: string) {
  // Stable id for this browser tab — used as the leader id
  const myIdRef = useRef<string>("");
  if (!myIdRef.current) {
    myIdRef.current = crypto.randomUUID();
  }

  const [leader, setLeader] = useState<LeaderState | null>(null);
  const leaderRef = useRef<LeaderState | null>(null);
  useEffect(() => {
    leaderRef.current = leader;
  }, [leader]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myNameRef = useRef(myName);
  useEffect(() => {
    myNameRef.current = myName;
  }, [myName]);

  // ---------- Subscribe to the channel ----------
  useEffect(() => {
    if (!filename || !isSupabaseReady) {
      channelRef.current = null;
      return;
    }

    const channelName = buildLeaderChannel(filename);
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on("broadcast", { event: EVENT_LEADER_CLAIM }, ({ payload }) => {
        const claim = payload as LeaderState;
        if (!claim || !claim.leaderId) return;
        setLeader(claim);
      })
      .on("broadcast", { event: EVENT_LEADER_RELEASE }, ({ payload }) => {
        const releaser = payload as { leaderId: string };
        if (!releaser) return;
        // Only clear if the releaser is the current leader
        setLeader((current) =>
          current && current.leaderId === releaser.leaderId ? null : current,
        );
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

  // ---------- Expire stale leader (in case they crashed) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const current = leaderRef.current;
      if (!current) return;
      // If we are NOT the leader and we haven't heard from them recently,
      // assume they're gone and clear the state locally.
      if (
        current.leaderId !== myIdRef.current &&
        Date.now() - current.takenAt > LEADER_STALE_MS
      ) {
        setLeader(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Sending claim / release ----------
  const sendClaim = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const claim: LeaderState = {
      leaderId: myIdRef.current,
      leaderName: myNameRef.current || "Someone",
      takenAt: Date.now(),
    };
    setLeader(claim);
    channel.send({
      type: "broadcast",
      event: EVENT_LEADER_CLAIM,
      payload: claim,
    });
  }, []);

  const sendRelease = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    setLeader(null);
    channel.send({
      type: "broadcast",
      event: EVENT_LEADER_RELEASE,
      payload: { leaderId: myIdRef.current },
    });
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // ---------- Public actions ----------
  const claim = useCallback(() => {
    sendClaim();
    // Start heartbeats so followers know we're still alive
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(() => {
      const current = leaderRef.current;
      if (current && current.leaderId === myIdRef.current) {
        sendClaim();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendClaim]);

  const release = useCallback(() => {
    sendRelease();
  }, [sendRelease]);

  // Clean up heartbeats on unmount
  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, []);

  // Convenience flags
  const isLeader = leader?.leaderId === myIdRef.current;
  const isLocked = leader !== null && !isLeader;

  return {
    leader,
    isLeader,
    isLocked,
    claim,
    release,
  };
}
