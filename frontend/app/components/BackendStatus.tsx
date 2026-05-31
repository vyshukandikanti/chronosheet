// BackendStatus.tsx
// =================
// A small status indicator that checks if the Python backend is alive.
// Shows a colored dot + label in the top right of the page.
//
// How it works:
// 1. When the page loads, it sends a request to http://localhost:8000/health
// 2. If the backend replies with success, it shows "Backend Connected" (emerald)
// 3. If it does not reply, it shows "Backend Offline" (red)
// 4. While waiting for the reply, it shows "Checking..." (yellow)
//
// Why "use client":
// This component uses React state and effects, which only run in the browser.
// The "use client" directive tells Next.js this is a client-side component.

"use client";

import { useEffect, useState } from "react";

// The three possible states of our connection
type Status = "checking" | "connected" | "offline";

export default function BackendStatus() {
  // React state to remember the current connection status
  const [status, setStatus] = useState<Status>("checking");

  // This runs once when the component is shown on screen
  useEffect(() => {
    // Send a request to the backend health endpoint
    fetch("http://localhost:8000/health")
      .then((response) => {
        // If the response is okay (status 200), backend is alive
        if (response.ok) {
          setStatus("connected");
        } else {
          setStatus("offline");
        }
      })
      .catch(() => {
        // If anything fails (no network, server down), mark as offline
        setStatus("offline");
      });
  }, []);

  // Different visual settings for each state
  const display = {
    checking: {
      dotColor: "bg-yellow-400",
      textColor: "text-yellow-300",
      label: "Checking backend...",
    },
    connected: {
      dotColor: "bg-emerald-400",
      textColor: "text-emerald-300",
      label: "Backend connected",
    },
    offline: {
      dotColor: "bg-red-400",
      textColor: "text-red-300",
      label: "Backend offline",
    },
  };

  // Pick the right settings based on current status
  const current = display[status];

  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${current.textColor}`}>
      {/* The colored dot, with a pulsing animation */}
      <span className={`h-2 w-2 rounded-full ${current.dotColor} animate-pulse`} />
      {/* The status text */}
      <span>{current.label}</span>
    </div>
  );
}
