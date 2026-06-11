// app/share/page.tsx
// ===================
// The PUBLIC share page — anyone with a link can view a snapshot here.
// No login. No edit buttons. Just read-only viewing.
//
// URL pattern: /share?id=<snapshot_id>
// Example:     chronosheet.netlify.app/share?id=abc-123
//
// How it works:
// 1. Page reads the snapshot ID from the URL query parameter (?id=...)
// 2. Fetches the snapshot from the backend's /public-snapshot/<id> endpoint
// 3. Renders the spreadsheet in read-only mode
// 4. Shows a "Try ChronoSheet" call-to-action at the bottom

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Backend URL — uses env var in production, falls back to localhost in dev
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Cell types (matches what the backend returns)
type Cell = string | number | boolean | null;

// The shape of a snapshot row from the backend
type Snapshot = {
  id?: string;
  filename?: string;
  sheet_name?: string;
  saved_at?: string;
  data?: Cell[][];
  row_count?: number;
  column_count?: number;
  changes_from_previous?: number;
  note?: string | null;
  author?: string | null;
  // Allow extra fields without TypeScript complaining
  [key: string]: unknown;
};

// The inner component that uses search params (must be wrapped in Suspense)
function SharePageContent() {
  const searchParams = useSearchParams();
  const snapshotId = searchParams.get("id");

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No ID in the URL — show an error
    if (!snapshotId) {
      setError("No snapshot ID in the URL. The link looks incomplete.");
      setLoading(false);
      return;
    }

    // Fetch the snapshot from the backend
    fetch(`${BACKEND_URL}/public-snapshot/${snapshotId}`)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("This snapshot doesn't exist or was deleted.");
          }
          throw new Error(`Server error (${response.status}). Please try again.`);
        }
        return response.json();
      })
      .then((data: Snapshot) => {
        setSnapshot(data);
        setLoading(false);
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load snapshot. Please check your connection.",
        );
        setLoading(false);
      });
  }, [snapshotId]);

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mb-4" />
          <p className="text-emerald-300">Loading snapshot...</p>
        </div>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-300">
            Couldn&apos;t load this snapshot
          </h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Go to ChronoSheet
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Snapshot loaded ----------
  // The data is a 2D array — first row is treated as headers (like Excel)
  const data = snapshot?.data ?? [];
  const hasData = data.length > 0;
  const headers = hasData ? data[0] : [];
  const rows = hasData ? data.slice(1) : [];

  // Helper to render a cell value safely
  const renderCell = (value: Cell): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  };

  // Display a friendly name + timestamp
  const displayName = snapshot?.filename || "Untitled Snapshot";
  const sheetName = snapshot?.sheet_name;
  const timestamp = snapshot?.saved_at;
  const author = snapshot?.author || "Anonymous";
  const note = snapshot?.note;
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top banner — makes it obvious this is read-only */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
            <span>👀</span>
            <span>Viewing shared snapshot — read only</span>
          </div>
          <Link
            href="/"
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-full transition"
          >
            Try ChronoSheet →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">{displayName}</h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-slate-400">
            {sheetName && (
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-emerald-300">
                📑 {sheetName}
              </span>
            )}
            <span>By <span className="text-emerald-400">{author}</span></span>
            {formattedTime && (
              <>
                <span className="text-slate-600">·</span>
                <span>Saved on {formattedTime}</span>
              </>
            )}
          </div>
          {note && (
            <p className="mt-3 inline-block rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm italic text-slate-300">
              📝 {note}
            </p>
          )}
        </div>

        {/* Spreadsheet grid */}
        {hasData ? (
          <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            <div className="overflow-auto max-h-[70vh]">
              <table className="min-w-full">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300 border-b border-slate-600 w-12">
                      #
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-300 border-b border-slate-600 whitespace-nowrap"
                      >
                        {renderCell(header) || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-slate-700/50 transition"
                    >
                      <td className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 text-sm text-slate-100 border-b border-slate-700 whitespace-nowrap"
                        >
                          {renderCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-slate-900 border-t border-slate-700 text-xs text-slate-500">
              {rows.length} rows × {headers.length} columns
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            This snapshot doesn&apos;t contain any spreadsheet data.
          </div>
        )}

        {/* Bottom call-to-action */}
        <div className="mt-8 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold mb-2">
            Love what you see? Build your own.
          </h2>
          <p className="text-slate-300 text-sm mb-4">
            ChronoSheet gives spreadsheets a time machine. Every change saved.
            Every version remembered.
          </p>
          <Link
            href="/"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Try ChronoSheet — Free →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Export wrapper — Next.js requires Suspense around useSearchParams
export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="text-emerald-300">Loading...</div>
        </div>
      }
    >
      <SharePageContent />
    </Suspense>
  );
}
