// ChronoSheet — Home Page
// =========================
// Client component for interactive features:
//   - Upload button that opens a file picker
//   - Live spreadsheet editing (click any cell to edit)
//   - Change tracking with visual highlights
//   - Save Snapshot button (will wire to backend next phase)

"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import BackendStatus from "./components/BackendStatus";

// The shape of the response we get from the backend after upload
type CellValue = string | number | boolean | null;
type SheetMatrix = CellValue[][];

type SpreadsheetData = {
  success: boolean;
  filename: string;
  sheet_name: string;
  row_count: number;
  column_count: number;
  data: SheetMatrix;
  message: string;
};

const BACKEND_URL = "http://localhost:8000";

// Convert a column index (0, 1, 2, ...) into Excel-style letters (A, B, C, ..., AA, AB, ...)
function columnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export default function Home() {
  // ===== STATE =====
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== HANDLERS =====
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/upload-spreadsheet`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const detail =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "Failed to upload the spreadsheet. Please try again.";
        throw new Error(detail);
      }

      const result: SpreadsheetData = await response.json();
      setSpreadsheet(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong during upload.";
      setErrorMessage(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReset = () => {
    setSpreadsheet(null);
    setErrorMessage(null);
  };

  // ===== RENDER =====
  if (spreadsheet) {
    return <SpreadsheetView data={spreadsheet} onReset={handleReset} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Brand />
        <div className="flex items-center gap-5">
          <BackendStatus />
          <span className="text-sm font-medium text-slate-500">v0.1 — Day Zero</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">

        <div className="flex flex-col justify-center">

          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Powered by Raft consensus and Artificial Intelligence
          </span>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Spreadsheets That{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              Remember.
            </span>
          </h1>

          <p className="mt-5 text-xl font-medium text-slate-300">
            Every Change. Every Reason. Every Time.
          </p>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">
            ChronoSheet is the intelligent history layer your data has always deserved.
            Track every cell change, understand why it happened, and travel through time
            with confidence.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="font-semibold">Upload error: </span>
              {errorMessage}
            </div>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="group flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span>Upload Spreadsheet</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>

            <button className="flex h-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-6 font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800">
              How It Works
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">●</span> Free forever
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">●</span> No installation needed
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">●</span> Works in any browser
            </span>
          </div>

        </div>

        <div className="flex items-center justify-center">
          <SpreadsheetPreview />
        </div>

      </main>

      <footer className="relative z-10 px-8 py-8 text-center text-sm text-slate-600">
        Excel forgets. ChronoSheet remembers.
      </footer>

    </div>
  );
}

// ============================================
// SPREADSHEET VIEW — Now with EDITING SUPPORT
// ============================================
function SpreadsheetView({
  data,
  onReset,
}: {
  data: SpreadsheetData;
  onReset: () => void;
}) {
  // A mutable copy of the data that the user can edit
  const [editedData, setEditedData] = useState<SheetMatrix>(() =>
    data.data.map((row) => [...row])
  );

  // Set of cells that have been changed (using "row-col" keys)
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());

  // The cell currently being edited (null when no cell is in edit mode)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // The current value in the edit input
  const [inputValue, setInputValue] = useState<string>("");

  // ------ Snapshot saving state (Phase 2: Time Machine) ------
  // Are we currently sending a snapshot to the backend?
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  // How many snapshots have we saved successfully in this session?
  const [savedCount, setSavedCount] = useState(0);
  // The most recent toast message to show (success or error)
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // ------ Time travel state (Phase 2: viewing history) ------
  // The list of all snapshots for this file (summaries, fetched from backend)
  type SnapshotSummary = {
    id: string;
    filename: string;
    sheet_name: string;
    saved_at: string;
    row_count: number;
    column_count: number;
    changes_from_previous: number;
    note: string | null;
  };
  const [snapshotsList, setSnapshotsList] = useState<SnapshotSummary[]>([]);
  // Is the history panel open?
  const [showHistory, setShowHistory] = useState(false);
  // If we are viewing a past snapshot, this holds its ID. Null means "current".
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  // The data of the snapshot being viewed (so we can show it instead of edited data)
  const [viewingSnapshotData, setViewingSnapshotData] = useState<SheetMatrix | null>(null);
  // Are we currently fetching a snapshot from the backend?
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  // ------ Editing handlers ------
  const startEditing = (row: number, col: number) => {
    setEditingCell({ row, col });
    setInputValue(String(editedData[row][col] ?? ""));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;

    // Save the new value into our mutable data
    setEditedData((previous) =>
      previous.map((rowArr, rowIndex) =>
        rowIndex === row
          ? rowArr.map((cellValue, colIndex) =>
              colIndex === col ? inputValue : cellValue
            )
          : rowArr
      )
    );

    // Decide whether to mark this cell as modified
    const cellKey = `${row}-${col}`;
    const originalValue = String(data.data[row][col] ?? "");
    if (inputValue !== originalValue) {
      // Cell value differs from original — mark as modified
      setModifiedCells((previous) => {
        const next = new Set(previous);
        next.add(cellKey);
        return next;
      });
    } else {
      // Cell was reverted back to its original value — unmark
      setModifiedCells((previous) => {
        const next = new Set(previous);
        next.delete(cellKey);
        return next;
      });
    }

    setEditingCell(null);
  };

  const cancelEdit = () => setEditingCell(null);

  const handleInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const discardAllChanges = () => {
    setEditedData(data.data.map((row) => [...row]));
    setModifiedCells(new Set());
    setEditingCell(null);
  };

  // ------ Save snapshot to backend (Phase 2 — Time Machine) ------
  // This sends the current state of the spreadsheet to the backend, which
  // appends it as a new entry in the Raft-style log. After a successful save,
  // we clear the "modified cells" set, because those edits are now preserved
  // forever in the snapshot history.
  const handleSaveSnapshot = async () => {
    setSavingSnapshot(true);
    setToast(null);

    try {
      const response = await fetch(`${BACKEND_URL}/save-snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          sheet_name: data.sheet_name,
          data: editedData,
          row_count: editedData.length,
          column_count: editedData[0]?.length ?? 0,
          changes_from_previous: modifiedCells.size,
          note: null,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const detail =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "Failed to save snapshot.";
        throw new Error(detail);
      }

      const result = await response.json();
      setSavedCount(result.total_snapshots);
      setModifiedCells(new Set()); // Clear modified cells — they are now saved
      setToast({
        kind: "success",
        text: `Snapshot saved! Total snapshots: ${result.total_snapshots}`,
      });

      // Make the toast disappear after 4 seconds
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save snapshot.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSavingSnapshot(false);
    }
  };

  // ------ Time travel handlers ------

  // Fetch the list of all snapshots for THIS filename
  const fetchSnapshotsList = async () => {
    try {
      const url = `${BACKEND_URL}/snapshots?filename=${encodeURIComponent(data.filename)}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const result = await response.json();
      setSnapshotsList(result.snapshots ?? []);
    } catch {
      // Silent fail — not critical
    }
  };

  // Load the list of snapshots when the component first appears,
  // and refresh it every time a new snapshot is saved.
  useEffect(() => {
    fetchSnapshotsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCount, data.filename]);

  // Travel back to a specific snapshot — fetch its full data and display
  const travelToSnapshot = async (snapshotId: string) => {
    setLoadingSnapshot(true);
    setToast(null);

    try {
      const response = await fetch(`${BACKEND_URL}/snapshot/${snapshotId}`);
      if (!response.ok) {
        throw new Error("Could not load snapshot.");
      }
      const snapshot = await response.json();
      setViewingSnapshotId(snapshotId);
      setViewingSnapshotData(snapshot.data);
      setEditingCell(null); // Stop any active editing when time-traveling
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to time travel.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  // Return to the current (most recent / editable) view
  const returnToCurrent = () => {
    setViewingSnapshotId(null);
    setViewingSnapshotData(null);
  };

  // ------ Render ------
  // Decide what data the table should show:
  // - If we are time-traveling → show the snapshot data
  // - Otherwise → show the user's current edited data
  const displayedData = viewingSnapshotData ?? editedData;
  const isReadOnly = viewingSnapshotId !== null;
  const viewingSnapshot = viewingSnapshotId
    ? snapshotsList.find((s) => s.id === viewingSnapshotId)
    : null;
  const changeCount = modifiedCells.size;
  const columnCount = displayedData[0]?.length ?? 0;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">

      {/* TOAST NOTIFICATION — appears after saving a snapshot */}
      {toast && (
        <div
          className={`fixed left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl backdrop-blur ${
            toast.kind === "success"
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
              : "border-red-500/50 bg-red-500/15 text-red-200"
          }`}
        >
          {toast.kind === "success" ? "✓ " : "✗ "}
          {toast.text}
        </div>
      )}

      {/* TOP HEADER BAR — sticky, with brand + actions */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Brand />
          <div className="flex flex-wrap items-center gap-3">
            {changeCount > 0 && (
              <>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {changeCount} change{changeCount > 1 ? "s" : ""}
                </span>
                <button
                  onClick={discardAllChanges}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveSnapshot}
                  disabled={savingSnapshot}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Saves this version as a permanent snapshot in the time machine log."
                >
                  {savingSnapshot ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Snapshot</span>
                  )}
                </button>
              </>
            )}
            {/* HISTORY BUTTON — opens the time travel panel */}
            <button
              onClick={() => setShowHistory((open) => !open)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                showHistory
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-purple-500/40 hover:text-purple-300"
              }`}
            >
              <span>🕐</span>
              <span>History</span>
              {snapshotsList.length > 0 && (
                <span className="ml-1 rounded-full bg-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-200">
                  {snapshotsList.length}
                </span>
              )}
            </button>

            <button
              onClick={onReset}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
            >
              ← Upload Another
            </button>
          </div>
        </div>
      </header>

      {/* TIME TRAVEL BANNER — only shown when viewing a past snapshot */}
      {isReadOnly && viewingSnapshot && (
        <div className="border-b border-purple-500/30 bg-purple-500/10 px-8 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 text-purple-200">
              <span className="text-lg">🕐</span>
              <span className="font-semibold">
                Time travel mode — viewing snapshot from {formatTimestamp(viewingSnapshot.saved_at)}
              </span>
              <span className="text-xs text-purple-400">(read-only)</span>
            </div>
            <button
              onClick={returnToCurrent}
              className="rounded-lg bg-purple-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-purple-400"
            >
              ← Return to Current
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-8 py-8">

        {/* FILE SUMMARY CARD */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{data.filename}</h1>
              <p className="mt-1 text-sm text-slate-400">
                Sheet: <span className="text-slate-200">{data.sheet_name}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Stat label="Rows" value={data.row_count} />
              <Stat label="Columns" value={data.column_count} />
              <Stat label="Edits" value={changeCount} highlight={changeCount > 0} />
              <Stat label="Snapshots" value={savedCount} highlight={savedCount > 0} />
            </div>
          </div>
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✓ {data.message} — <span className="text-emerald-200/80">Click any cell to edit. Press Enter to save, Escape to cancel.</span>
          </div>
        </div>

        {/* THE EDITABLE SPREADSHEET TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">

              {/* Column letter headers (like Excel: A, B, C, D ...) */}
              <thead className="border-b border-slate-800 bg-slate-900/90">
                <tr>
                  <th className="sticky left-0 z-10 w-12 bg-slate-900/95 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                    #
                  </th>
                  {Array.from({ length: columnCount }, (_, colIndex) => (
                    <th
                      key={colIndex}
                      className="min-w-[120px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      {columnLetter(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Editable rows (or read-only when time-traveling) */}
              <tbody className="divide-y divide-slate-800/80">
                {displayedData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="group/row">

                    {/* Row number column (not editable) */}
                    <td className="sticky left-0 z-10 w-12 bg-slate-900/95 px-3 py-3 text-center text-xs font-medium text-slate-500 group-hover/row:bg-slate-800/60">
                      {rowIndex + 1}
                    </td>

                    {/* Editable data cells (read-only when in time-travel mode) */}
                    {row.map((cellValue, colIndex) => {
                      const cellKey = `${rowIndex}-${colIndex}`;
                      const isEditing =
                        !isReadOnly &&
                        editingCell?.row === rowIndex &&
                        editingCell?.col === colIndex;
                      const isModified = !isReadOnly && modifiedCells.has(cellKey);

                      return (
                        <td
                          key={colIndex}
                          onClick={() => !isReadOnly && !isEditing && startEditing(rowIndex, colIndex)}
                          className={`min-w-[120px] px-4 py-3 transition-colors ${
                            isReadOnly
                              ? "cursor-default text-purple-100/90"
                              : isModified
                                ? "cursor-text bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-500/40"
                                : "cursor-text text-slate-300 hover:bg-slate-800/40"
                          }`}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={inputValue}
                              onChange={(event) => setInputValue(event.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={handleInputKey}
                              autoFocus
                              className="w-full rounded bg-slate-800 px-2 py-1 text-slate-100 outline-none ring-2 ring-emerald-500"
                            />
                          ) : (
                            <span className="block truncate">
                              {String(cellValue ?? "")}
                            </span>
                          )}
                        </td>
                      );
                    })}

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>

        {/* HELP FOOTER */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {isReadOnly
            ? "You are time-traveling. Click 'Return to Current' to go back to editing mode."
            : changeCount > 0
              ? `${changeCount} cell${changeCount > 1 ? "s" : ""} modified. Click "Save Snapshot" to preserve this version.`
              : "Click any cell to edit it. Changed cells will glow emerald."}
        </p>

      </main>

      {/* HISTORY SIDE PANEL — slides in from the right when showHistory is true */}
      {showHistory && (
        <>
          {/* Dark overlay behind the panel — clicking it closes the panel */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />

          {/* The actual side panel */}
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Time Machine</h2>
                <p className="text-xs text-slate-500">
                  {snapshotsList.length} snapshot{snapshotsList.length !== 1 ? "s" : ""} for this file
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* The list of snapshots */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {snapshotsList.length === 0 ? (
                <div className="mt-12 text-center text-sm text-slate-500">
                  <div className="mb-2 text-3xl">🕐</div>
                  <p>No snapshots yet.</p>
                  <p className="mt-1 text-xs">
                    Edit cells and click &quot;Save Snapshot&quot; to start your timeline.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* "Current" entry at the top */}
                  <button
                    onClick={() => {
                      returnToCurrent();
                      setShowHistory(false);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      !isReadOnly
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-900 hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300">📍 Current</span>
                      {!isReadOnly && (
                        <span className="text-xs font-medium text-emerald-400">Viewing</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {changeCount > 0
                        ? `${changeCount} unsaved change${changeCount > 1 ? "s" : ""}`
                        : "Latest editable version"}
                    </p>
                  </button>

                  {/* Each saved snapshot — newest first */}
                  {snapshotsList
                    .slice()
                    .reverse()
                    .map((snapshot, index) => {
                      const isViewing = viewingSnapshotId === snapshot.id;
                      const snapshotNumber = snapshotsList.length - index;

                      return (
                        <button
                          key={snapshot.id}
                          onClick={() => {
                            travelToSnapshot(snapshot.id);
                            setShowHistory(false);
                          }}
                          disabled={loadingSnapshot}
                          className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
                            isViewing
                              ? "border-purple-500/50 bg-purple-500/10"
                              : "border-slate-800 bg-slate-900 hover:border-purple-500/30 hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isViewing ? "text-purple-300" : "text-slate-200"}`}>
                              🕐 Snapshot #{snapshotNumber}
                            </span>
                            {isViewing && (
                              <span className="text-xs font-medium text-purple-400">Viewing</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatTimestamp(snapshot.saved_at)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {snapshot.changes_from_previous} change{snapshot.changes_from_previous !== 1 ? "s" : ""} from previous
                          </p>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-500">
              Powered by the Raft consensus log architecture
            </div>

          </aside>
        </>
      )}
    </div>
  );
}

// ============================================
// FORMAT TIMESTAMP — Friendly date display
// Converts "2026-05-31T12:19:10.228088" → "May 31, 12:19 PM"
// ============================================
function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoTimestamp;
  }
}

// ============================================
// STAT — Small metric card (file summary)
// ============================================
function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-2 ${
      highlight
        ? "border-emerald-500/40 bg-emerald-500/10"
        : "border-slate-800 bg-slate-950"
    }`}>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-emerald-300" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}

// ============================================
// BRAND — Logo + Wordmark
// ============================================
function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="h-7 w-7 text-slate-950"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <g opacity="0.55" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <line x1="14" y1="14" x2="14" y2="26" />
            <line x1="20" y1="14" x2="20" y2="26" />
            <line x1="26" y1="14" x2="26" y2="26" />
            <line x1="14" y1="14" x2="26" y2="14" />
            <line x1="14" y1="20" x2="26" y2="20" />
            <line x1="14" y1="26" x2="26" y2="26" />
          </g>
          <circle cx="20" cy="5" r="2.8" fill="currentColor" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight">
        Chrono<span className="text-emerald-400">Sheet</span>
      </span>
    </div>
  );
}

// ============================================
// SPREADSHEET PREVIEW — Right-side visual mock (welcome page)
// ============================================
function SpreadsheetPreview() {
  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs font-medium text-slate-500">sales_report.xlsx</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-slate-500">
            <div className="px-2 py-1.5">#</div>
            <div className="px-2 py-1.5">Item</div>
            <div className="px-2 py-1.5">Amount</div>
            <div className="px-2 py-1.5">Date</div>
          </div>
          <div className="mt-1 space-y-1">
            <PreviewRow num="1" item="Office Rent" amount="₹40,000" date="May 01" />
            <PreviewRow num="2" item="Supplies" amount="₹12,500" date="May 03" />
            <div className="grid grid-cols-4 gap-1 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/40 text-sm">
              <div className="px-2 py-1.5 text-slate-300">3</div>
              <div className="px-2 py-1.5 text-slate-200">Vendor X</div>
              <div className="px-2 py-1.5">
                <span className="text-slate-500 line-through">₹50,000</span>{" "}
                <span className="font-semibold text-emerald-300">₹75,000</span>
              </div>
              <div className="px-2 py-1.5 text-slate-300">May 15</div>
            </div>
            <PreviewRow num="4" item="Marketing" amount="₹20,000" date="May 20" />
          </div>
          <div className="mt-4 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-purple-400">AI Insight: </span>
            B3 changed from ₹50,000 to ₹75,000 on May 15 — likely linked to the new
            vendor entry added the same day.
          </div>
        </div>
        <div className="border-t border-slate-800 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Timeline</span>
            <span className="font-semibold text-emerald-300">May 15 · 11:00 AM</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-slate-800">
            <div className="absolute left-0 top-0 h-1.5 w-3/4 rounded-full bg-gradient-to-r from-emerald-500 to-purple-500" />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-emerald-400"
              style={{ left: "calc(75% - 8px)" }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-600">
            <span>May 1</span>
            <span>May 8</span>
            <span>May 15</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  num,
  item,
  amount,
  date,
}: {
  num: string;
  item: string;
  amount: string;
  date: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 text-sm text-slate-400">
      <div className="px-2 py-1.5">{num}</div>
      <div className="px-2 py-1.5">{item}</div>
      <div className="px-2 py-1.5">{amount}</div>
      <div className="px-2 py-1.5">{date}</div>
    </div>
  );
}
