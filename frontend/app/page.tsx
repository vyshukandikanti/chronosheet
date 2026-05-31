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

  // ------ AI Insights state (Phase 3: Groq analysis) ------
  type AIAnalysis = {
    summary: string;
    anomalies: string[];
    patterns: string[];
    data_quality: string[];
    recommendations: string[];
  };
  // Are we currently asking the AI for insights?
  const [analyzingAI, setAnalyzingAI] = useState(false);
  // The most recent AI analysis result
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  // Is the AI insights panel open?
  const [showAIPanel, setShowAIPanel] = useState(false);
  // Was the analysis just copied to clipboard? (used for the "Copied!" feedback)
  const [aiCopied, setAiCopied] = useState(false);

  // ------ Wave 1: Excel-style features ------
  // The most recently clicked cell — used as the "context" for insert/delete operations
  const [lastActive, setLastActive] = useState<{ row: number; col: number } | null>(null);
  // What the user typed in the search bar (live highlights matching cells)
  const [searchQuery, setSearchQuery] = useState("");
  // Which column is currently sorted (null = no sort, original order)
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  // Direction of sort: "asc" (smallest first) or "desc" (largest first)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Snapshot of the data BEFORE any sorting started.
  // This lets us "unsort" and return to the original row order.
  const [preSortOrder, setPreSortOrder] = useState<SheetMatrix | null>(null);
  // Is the Statistics panel open?
  const [showStats, setShowStats] = useState(false);
  // How dates should be displayed throughout the table
  type DateFormat = "iso" | "dmy" | "mdy" | "short" | "long";
  const [dateFormat, setDateFormat] = useState<DateFormat>("iso");

  // ------ Undo / Redo history (like Ctrl+Z in Excel) ------
  // Each item in the stack is a snapshot of (editedData + modifiedCells)
  type UndoSnapshot = {
    data: SheetMatrix;
    modified: Set<string>;
  };
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<UndoSnapshot[]>([]);
  const MAX_HISTORY = 50;

  // Save the CURRENT state to the undo stack before making a change.
  // Always call this RIGHT BEFORE modifying editedData or modifiedCells.
  const captureSnapshot = () => {
    const snap: UndoSnapshot = {
      data: editedData.map((row) => [...row]),
      modified: new Set(modifiedCells),
    };
    setUndoStack((previous) => {
      const next = [...previous, snap];
      // Keep the history bounded so memory does not explode
      if (next.length > MAX_HISTORY) {
        next.shift();
      }
      return next;
    });
    // Whenever a NEW action happens, the future is gone — clear the redo stack
    setRedoStack([]);
  };

  // Undo the most recent change
  const performUndo = () => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    // Save current state to redo (so user can re-do this undo)
    const currentSnapshot: UndoSnapshot = {
      data: editedData.map((row) => [...row]),
      modified: new Set(modifiedCells),
    };
    setRedoStack((previous) => [...previous, currentSnapshot]);
    // Pop from undo and restore
    setUndoStack((previous) => previous.slice(0, -1));
    setEditedData(lastSnapshot.data);
    setModifiedCells(lastSnapshot.modified);
    setEditingCell(null);
  };

  // Redo a change that was just undone
  const performRedo = () => {
    if (redoStack.length === 0) return;
    const futureSnapshot = redoStack[redoStack.length - 1];
    const currentSnapshot: UndoSnapshot = {
      data: editedData.map((row) => [...row]),
      modified: new Set(modifiedCells),
    };
    setUndoStack((previous) => [...previous, currentSnapshot]);
    setRedoStack((previous) => previous.slice(0, -1));
    setEditedData(futureSnapshot.data);
    setModifiedCells(futureSnapshot.modified);
    setEditingCell(null);
  };

  // (Ctrl+Z / Ctrl+Y keyboard handler — moved below, after viewingSnapshotId is declared)

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

  // ------ Keyboard shortcut handler for Ctrl+Z / Ctrl+Y ------
  // Placed here, after viewingSnapshotId is declared, so it can safely reference it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept if the user is typing in a text input
      // (let browser handle in-input undo there)
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't allow undo/redo when time-traveling (read-only mode)
      if (viewingSnapshotId !== null) return;

      const isUndo =
        (event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey;
      const isRedo =
        ((event.ctrlKey || event.metaKey) && event.key === "y") ||
        ((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey);

      if (isUndo) {
        event.preventDefault();
        performUndo();
      } else if (isRedo) {
        event.preventDefault();
        performRedo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, redoStack, editedData, modifiedCells, viewingSnapshotId]);

  // ------ Editing handlers ------
  const startEditing = (row: number, col: number) => {
    setEditingCell({ row, col });
    setLastActive({ row, col }); // Remember this position for toolbar operations
    setInputValue(String(editedData[row][col] ?? ""));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;

    // Only capture if the value actually changed (for undo history)
    const previousCellValue = String(editedData[row][col] ?? "");
    if (inputValue !== previousCellValue) {
      captureSnapshot();
    }

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
    setLastActive(null);
  };

  // ============================================
  // Wave 1: Excel-style row and column operations
  // ============================================

  // Add a new empty row at the bottom of the spreadsheet
  const addRowAtEnd = () => {
    captureSnapshot();
    const numCols = editedData[0]?.length ?? 1;
    const emptyRow: CellValue[] = Array(numCols).fill("");
    setEditedData((previous) => [...previous, emptyRow]);
    setModifiedCells(new Set()); // Reset because indices may shift
  };

  // Insert a new empty row at a specific position (rest shifts down)
  const insertRowAtPosition = (position: number) => {
    captureSnapshot();
    const numCols = editedData[0]?.length ?? 1;
    const emptyRow: CellValue[] = Array(numCols).fill("");
    setEditedData((previous) => {
      const copy = [...previous];
      copy.splice(position, 0, emptyRow);
      return copy;
    });
    setModifiedCells(new Set());
    setEditingCell(null);
  };

  // Delete a row at a specific position
  const deleteRowAtPosition = (position: number) => {
    if (editedData.length <= 1) return; // Don't delete the last row
    captureSnapshot();
    setEditedData((previous) => previous.filter((_, index) => index !== position));
    setModifiedCells(new Set());
    setEditingCell(null);
    setLastActive(null);
  };

  // Add a new empty column to the right of the spreadsheet
  const addColumnAtEnd = () => {
    captureSnapshot();
    setEditedData((previous) => previous.map((row) => [...row, ""]));
    setModifiedCells(new Set());
  };

  // Insert a new empty column at a specific position
  const insertColumnAtPosition = (position: number) => {
    captureSnapshot();
    setEditedData((previous) =>
      previous.map((row) => {
        const copy = [...row];
        copy.splice(position, 0, "");
        return copy;
      })
    );
    setModifiedCells(new Set());
    setEditingCell(null);
  };

  // Delete a column at a specific position
  const deleteColumnAtPosition = (position: number) => {
    const numCols = editedData[0]?.length ?? 0;
    if (numCols <= 1) return; // Don't delete the last column
    captureSnapshot();
    setEditedData((previous) =>
      previous.map((row) => row.filter((_, index) => index !== position))
    );
    setModifiedCells(new Set());
    setEditingCell(null);
    setLastActive(null);
  };

  // Helper: does this cell match the current search query?
  const cellMatchesSearch = (cellValue: CellValue): boolean => {
    if (!searchQuery.trim()) return false;
    return String(cellValue ?? "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  };

  // ============================================
  // Wave 1: Smart Cleanup — Remove ALL empty rows in one click
  // ============================================
  // An empty row is one where every cell is blank/whitespace.
  // This includes empty rows in the middle (which auto-skip on upload preserves).
  const smartCleanup = () => {
    // Find empty rows (any row where every cell is blank)
    const isEmptyRow = (row: CellValue[]): boolean => {
      return row.every((cell) => {
        if (cell === null || cell === undefined) return true;
        return String(cell).trim() === "";
      });
    };

    const emptyRowCount = editedData.filter(isEmptyRow).length;

    if (emptyRowCount === 0) {
      // Nothing to clean — give friendly feedback
      setToast({
        kind: "success",
        text: "Spreadsheet is already clean — no empty rows found!",
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Save current state for undo BEFORE making the change
    captureSnapshot();

    // Keep only the non-empty rows
    const cleaned = editedData.filter((row) => !isEmptyRow(row));

    setEditedData(cleaned);
    setModifiedCells(new Set()); // Reset because row indices shifted
    setEditingCell(null);
    setLastActive(null);

    setToast({
      kind: "success",
      text: `Removed ${emptyRowCount} empty row${emptyRowCount > 1 ? "s" : ""}. Press Ctrl+Z to undo.`,
    });
    setTimeout(() => setToast(null), 4000);
  };

  // ============================================
  // Wave 1: Sort by column — 3-state cycle (asc → desc → unsorted)
  // ============================================
  // Click 1: Sort ascending (smallest/A-Z first)
  // Click 2: Sort descending (largest/Z-A first)
  // Click 3: Unsort (return to the original row order before any sorting)
  // Click on a different column: Sort that column ascending
  const sortByColumn = (colIndex: number) => {
    captureSnapshot();

    // ----- CASE 1: Third click on same column → UNSORT (restore original order) -----
    if (sortColumn === colIndex && sortDirection === "desc") {
      if (preSortOrder) {
        setEditedData(preSortOrder);
        setPreSortOrder(null);
      }
      setSortColumn(null);
      setSortDirection("asc");
      setModifiedCells(new Set());
      setEditingCell(null);
      setLastActive(null);
      return;
    }

    // ----- CASE 2: First sort starting from unsorted state → remember original order -----
    if (sortColumn === null) {
      // Save a deep copy so we can restore later
      setPreSortOrder(editedData.map((row) => [...row]));
    }

    // Decide direction:
    // - Same column currently asc → switch to desc
    // - Otherwise (new column, or unsorted) → asc
    let nextDirection: "asc" | "desc" = "asc";
    if (sortColumn === colIndex && sortDirection === "asc") {
      nextDirection = "desc";
    }

    // ----- Smart sorting that handles numbers and text -----
    const sorted = [...editedData].sort((rowA, rowB) => {
      const valueA = rowA[colIndex];
      const valueB = rowB[colIndex];

      // Empty values always go to the bottom
      const isEmptyA = valueA === "" || valueA === null || valueA === undefined;
      const isEmptyB = valueB === "" || valueB === null || valueB === undefined;
      if (isEmptyA && isEmptyB) return 0;
      if (isEmptyA) return 1;
      if (isEmptyB) return -1;

      // Try numeric comparison first
      const numberA = parseFloat(String(valueA));
      const numberB = parseFloat(String(valueB));
      if (!isNaN(numberA) && !isNaN(numberB)) {
        return nextDirection === "asc" ? numberA - numberB : numberB - numberA;
      }

      // Fall back to text comparison (case-insensitive)
      const textA = String(valueA).toLowerCase();
      const textB = String(valueB).toLowerCase();
      if (textA < textB) return nextDirection === "asc" ? -1 : 1;
      if (textA > textB) return nextDirection === "asc" ? 1 : -1;
      return 0;
    });

    setEditedData(sorted);
    setSortColumn(colIndex);
    setSortDirection(nextDirection);
    setModifiedCells(new Set()); // Reset because rows moved around
    setEditingCell(null);
    setLastActive(null);
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

  // ------ AI Analysis handler (Phase 3 — Groq) ------
  // Sends the current spreadsheet data to the backend, which calls Groq AI
  // and returns a structured analysis (anomalies, patterns, recommendations).
  const handleAnalyzeWithAI = async () => {
    setAnalyzingAI(true);
    setToast(null);
    setShowAIPanel(true);
    setAiAnalysis(null);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze-spreadsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          sheet_name: data.sheet_name,
          data: viewingSnapshotData ?? editedData,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const detail =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "AI analysis failed.";
        throw new Error(detail);
      }

      const result = await response.json();
      setAiAnalysis(result.analysis);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not analyze with AI.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 5000);
      setShowAIPanel(false);
    } finally {
      setAnalyzingAI(false);
    }
  };

  // ------ Copy AI Analysis to Clipboard ------
  // Formats the AI insights as nicely-formatted plain text and copies
  // them to the clipboard. The text is ready to paste into email, Slack,
  // Notion, Word, or anywhere else.
  const copyAIAnalysisToClipboard = async () => {
    if (!aiAnalysis) return;

    const text = formatAnalysisAsPlainText(aiAnalysis, data.filename);

    try {
      await navigator.clipboard.writeText(text);
      setAiCopied(true);
      // Reset the "Copied!" label back to "Copy" after 2 seconds
      setTimeout(() => setAiCopied(false), 2000);
    } catch {
      setToast({ kind: "error", text: "Could not copy to clipboard." });
      setTimeout(() => setToast(null), 3000);
    }
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
            {/* ANALYZE WITH AI BUTTON — opens insights panel */}
            <button
              onClick={handleAnalyzeWithAI}
              disabled={analyzingAI}
              className="group flex items-center gap-2 rounded-lg border border-purple-500/40 bg-gradient-to-r from-purple-500/15 to-emerald-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition-colors hover:from-purple-500/25 hover:to-emerald-500/15 hover:text-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Use AI to find anomalies, patterns, and insights in your spreadsheet"
            >
              {analyzingAI ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Analyze with AI</span>
                </>
              )}
            </button>

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

        {/* EXCEL-STYLE TOOLBAR — Wave 1 */}
        {!isReadOnly && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex flex-wrap items-center gap-2">

              {/* Label */}
              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Toolbar
              </span>

              {/* ----- UNDO / REDO ----- */}
              <ToolbarButton
                onClick={performUndo}
                icon="↶"
                label="Undo"
                disabled={undoStack.length === 0}
                title={
                  undoStack.length > 0
                    ? `Undo last change (Ctrl+Z) — ${undoStack.length} action${undoStack.length > 1 ? "s" : ""} available`
                    : "Nothing to undo"
                }
              />
              <ToolbarButton
                onClick={performRedo}
                icon="↷"
                label="Redo"
                disabled={redoStack.length === 0}
                title={
                  redoStack.length > 0
                    ? `Redo undone change (Ctrl+Y) — ${redoStack.length} action${redoStack.length > 1 ? "s" : ""} available`
                    : "Nothing to redo"
                }
              />

              {/* Divider */}
              <span className="mx-2 h-6 w-px bg-slate-700" />

              {/* ----- ROW OPERATIONS ----- */}
              <ToolbarButton
                onClick={addRowAtEnd}
                icon="➕"
                label="Add Row"
                title="Add a new empty row at the bottom"
              />
              <ToolbarButton
                onClick={() => lastActive && insertRowAtPosition(lastActive.row)}
                icon="⬆️"
                label="Insert Row Above"
                disabled={!lastActive}
                title={lastActive ? `Insert row above row ${lastActive.row + 1}` : "Click a cell first"}
              />
              <ToolbarButton
                onClick={() => lastActive && insertRowAtPosition(lastActive.row + 1)}
                icon="⬇️"
                label="Insert Row Below"
                disabled={!lastActive}
                title={lastActive ? `Insert row below row ${lastActive.row + 1}` : "Click a cell first"}
              />
              <ToolbarButton
                onClick={() => lastActive && deleteRowAtPosition(lastActive.row)}
                icon="❌"
                label="Delete Row"
                disabled={!lastActive}
                danger
                title={lastActive ? `Delete row ${lastActive.row + 1}` : "Click a cell first"}
              />

              {/* Divider */}
              <span className="mx-2 h-6 w-px bg-slate-700" />

              {/* ----- COLUMN OPERATIONS ----- */}
              <ToolbarButton
                onClick={addColumnAtEnd}
                icon="➕"
                label="Add Column"
                title="Add a new empty column at the right"
              />
              <ToolbarButton
                onClick={() => lastActive && insertColumnAtPosition(lastActive.col)}
                icon="⬅️"
                label="Insert Col Left"
                disabled={!lastActive}
                title={lastActive ? `Insert column left of column ${columnLetter(lastActive.col)}` : "Click a cell first"}
              />
              <ToolbarButton
                onClick={() => lastActive && insertColumnAtPosition(lastActive.col + 1)}
                icon="➡️"
                label="Insert Col Right"
                disabled={!lastActive}
                title={lastActive ? `Insert column right of column ${columnLetter(lastActive.col)}` : "Click a cell first"}
              />
              <ToolbarButton
                onClick={() => lastActive && deleteColumnAtPosition(lastActive.col)}
                icon="❌"
                label="Delete Column"
                disabled={!lastActive}
                danger
                title={lastActive ? `Delete column ${columnLetter(lastActive.col)}` : "Click a cell first"}
              />

              {/* Divider */}
              <span className="mx-2 h-6 w-px bg-slate-700" />

              {/* ----- SEARCH BOX ----- */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5">
                <span className="text-slate-500">🔎</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search cells..."
                  className="w-40 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-slate-500 hover:text-slate-300"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Divider */}
              <span className="mx-2 h-6 w-px bg-slate-700" />

              {/* ----- SMART CLEANUP ----- */}
              <ToolbarButton
                onClick={smartCleanup}
                icon="🧹"
                label="Cleanup"
                title="Remove ALL empty rows in one click (Ctrl+Z to undo)"
              />

              {/* ----- DATE FORMAT PICKER ----- */}
              <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
                <span className="text-xs text-slate-500">📅</span>
                <select
                  value={dateFormat}
                  onChange={(event) => setDateFormat(event.target.value as DateFormat)}
                  className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                  title="Choose how dates are displayed"
                >
                  <option value="iso">ISO (2026-01-20)</option>
                  <option value="dmy">DD/MM/YYYY (20/01/2026)</option>
                  <option value="mdy">MM/DD/YYYY (01/20/2026)</option>
                  <option value="short">Short (20 Jan 2026)</option>
                  <option value="long">Long (January 20, 2026)</option>
                </select>
              </div>

              {/* ----- STATISTICS TOGGLE ----- */}
              <ToolbarButton
                onClick={() => setShowStats((open) => !open)}
                icon="📊"
                label={showStats ? "Hide Stats" : "Show Stats"}
                title="Toggle the statistics panel (Sum, Average, Min, Max per column)"
              />

              {/* ----- ACTIVE POSITION INDICATOR ----- */}
              {lastActive && (
                <span className="ml-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Active: {columnLetter(lastActive.col)}{lastActive.row + 1}
                </span>
              )}

            </div>
          </div>
        )}

        {/* THE EDITABLE SPREADSHEET TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">

              {/* Column letter headers (like Excel: A, B, C, D ...) — click to sort */}
              <thead className="border-b border-slate-800 bg-slate-900/90">
                <tr>
                  <th className="sticky left-0 z-10 w-12 bg-slate-900/95 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                    #
                  </th>
                  {Array.from({ length: columnCount }, (_, colIndex) => {
                    const isSorted = sortColumn === colIndex;
                    const arrow = isSorted ? (sortDirection === "asc" ? " ▲" : " ▼") : "";
                    // Helpful tooltip explains the 3-click cycle
                    const tooltip = isReadOnly
                      ? ""
                      : isSorted && sortDirection === "asc"
                        ? `Click again for descending ▼ on column ${columnLetter(colIndex)}`
                        : isSorted && sortDirection === "desc"
                          ? `Click again to restore original order (unsort)`
                          : `Click to sort by column ${columnLetter(colIndex)} ascending ▲`;
                    return (
                      <th
                        key={colIndex}
                        onClick={() => !isReadOnly && sortByColumn(colIndex)}
                        className={`min-w-[120px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors ${
                          isReadOnly
                            ? "text-slate-400"
                            : isSorted
                              ? "cursor-pointer bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                              : "cursor-pointer text-slate-400 hover:bg-slate-800/50 hover:text-emerald-300"
                        }`}
                        title={tooltip}
                      >
                        {columnLetter(colIndex)}{arrow}
                      </th>
                    );
                  })}
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
                      const isSearchMatch = cellMatchesSearch(cellValue);
                      const isActiveCell =
                        !isReadOnly &&
                        lastActive?.row === rowIndex &&
                        lastActive?.col === colIndex &&
                        !isEditing;

                      return (
                        <td
                          key={colIndex}
                          onClick={() => !isReadOnly && !isEditing && startEditing(rowIndex, colIndex)}
                          className={`min-w-[120px] px-4 py-3 transition-colors ${
                            isReadOnly
                              ? "cursor-default text-purple-100/90"
                              : isSearchMatch
                                ? "cursor-text bg-yellow-500/20 text-yellow-100 ring-1 ring-inset ring-yellow-500/50"
                                : isModified
                                  ? "cursor-text bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-500/40"
                                  : isActiveCell
                                    ? "cursor-text bg-slate-800/60 text-slate-100 ring-1 ring-inset ring-slate-500/50"
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
                              {formatCellForDisplay(cellValue, dateFormat)}
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

        {/* STATISTICS PANEL — Wave 1 */}
        {showStats && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span>📊</span>
                <span>Column Statistics</span>
              </h3>
              <span className="text-xs text-slate-500">
                Based on all {displayedData.length} rows
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="flex gap-3">
                {Array.from({ length: columnCount }, (_, colIndex) => {
                  const stats = computeColumnStats(displayedData, colIndex);
                  return (
                    <div
                      key={colIndex}
                      className="min-w-[180px] flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">
                          Column {columnLetter(colIndex)}
                        </span>
                        <span className="text-[10px] uppercase text-slate-600">
                          {stats.numeric ? "Numeric" : "Text"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <StatRow label="Filled" value={stats.count} />
                        {stats.empty > 0 && (
                          <StatRow label="Empty" value={stats.empty} warning />
                        )}
                        {stats.numeric && (
                          <>
                            <StatRow label="Sum" value={formatNumber(stats.sum)} />
                            <StatRow label="Average" value={formatNumber(stats.avg)} />
                            <StatRow label="Min" value={formatNumber(stats.min)} />
                            <StatRow label="Max" value={formatNumber(stats.max)} />
                          </>
                        )}
                        {!stats.numeric && stats.uniqueCount !== undefined && (
                          <StatRow label="Unique" value={stats.uniqueCount} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* HELP FOOTER */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {isReadOnly
            ? "You are time-traveling. Click 'Return to Current' to go back to editing mode."
            : changeCount > 0
              ? `${changeCount} cell${changeCount > 1 ? "s" : ""} modified. Click "Save Snapshot" to preserve this version.`
              : "Click any cell to edit it. Changed cells will glow emerald."}
        </p>

      </main>

      {/* AI INSIGHTS PANEL — appears when showAIPanel is true */}
      {showAIPanel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => !analyzingAI && setShowAIPanel(false)}
          />

          <aside className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-950 shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">AI Insights</h2>
                  <p className="text-xs text-slate-400">
                    Powered by Llama 3.3 70B via Groq
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Copy button — only shown when there are insights to copy */}
                {aiAnalysis && !analyzingAI && (
                  <button
                    onClick={copyAIAnalysisToClipboard}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      aiCopied
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-purple-500/40 hover:text-purple-200"
                    }`}
                    title="Copy the entire analysis as plain text"
                  >
                    {aiCopied ? (
                      <>
                        <span>✓</span>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => !analyzingAI && setShowAIPanel(false)}
                  disabled={analyzingAI}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {analyzingAI ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="relative">
                    <span className="block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-400" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">✨</span>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-purple-200">
                      AI is reading your spreadsheet...
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Llama 3.3 70B is finding anomalies, patterns, and insights.
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Usually takes 3 to 8 seconds.
                    </p>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-5">

                  {/* SUMMARY */}
                  {aiAnalysis.summary && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                        📋 Summary
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-200">
                        {aiAnalysis.summary}
                      </p>
                    </div>
                  )}

                  {/* ANOMALIES */}
                  {aiAnalysis.anomalies && aiAnalysis.anomalies.length > 0 && (
                    <InsightSection
                      icon="🚨"
                      title="Anomalies"
                      color="red"
                      items={aiAnalysis.anomalies}
                    />
                  )}

                  {/* PATTERNS */}
                  {aiAnalysis.patterns && aiAnalysis.patterns.length > 0 && (
                    <InsightSection
                      icon="🔍"
                      title="Patterns"
                      color="purple"
                      items={aiAnalysis.patterns}
                    />
                  )}

                  {/* DATA QUALITY */}
                  {aiAnalysis.data_quality && aiAnalysis.data_quality.length > 0 && (
                    <InsightSection
                      icon="⚠️"
                      title="Data Quality"
                      color="amber"
                      items={aiAnalysis.data_quality}
                    />
                  )}

                  {/* RECOMMENDATIONS */}
                  {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                    <InsightSection
                      icon="💡"
                      title="Recommendations"
                      color="cyan"
                      items={aiAnalysis.recommendations}
                    />
                  )}

                  {/* Re-analyze button */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleAnalyzeWithAI}
                      className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/20"
                    >
                      ✨ Analyze again
                    </button>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  No analysis yet. Click &quot;Analyze with AI&quot; to start.
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-3 text-center text-xs text-slate-500">
              AI can make mistakes. Always verify important findings yourself.
            </div>

          </aside>
        </>
      )}

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
// FORMAT CELL FOR DISPLAY
// Detects date strings (like "2026-01-20") and re-formats them based on
// the user's preferred format. Non-date values are returned as-is.
// ============================================
type DateFormatChoice = "iso" | "dmy" | "mdy" | "short" | "long";

// Regex that matches "YYYY-MM-DD" optionally followed by " HH:MM:SS"
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatCellForDisplay(
  cellValue: string | number | boolean | null,
  format: DateFormatChoice
): string {
  if (cellValue === null || cellValue === undefined) return "";
  const text = String(cellValue);

  // Try to parse it as a date
  const match = text.match(DATE_PATTERN);
  if (!match) return text; // Not a date — return original text

  const year = match[1];
  const month = match[2];
  const day = match[3];
  const hasTime = match[4] !== undefined;
  const timePart = hasTime ? ` ${match[4]}:${match[5]}` : "";

  const monthIndex = parseInt(month, 10) - 1;

  switch (format) {
    case "iso":
      return `${year}-${month}-${day}${timePart}`;
    case "dmy":
      return `${day}/${month}/${year}${timePart}`;
    case "mdy":
      return `${month}/${day}/${year}${timePart}`;
    case "short":
      return `${parseInt(day, 10)} ${SHORT_MONTHS[monthIndex]} ${year}${timePart}`;
    case "long":
      return `${LONG_MONTHS[monthIndex]} ${parseInt(day, 10)}, ${year}${timePart}`;
    default:
      return text;
  }
}

// ============================================
// COLUMN STATISTICS — Computes Sum, Avg, Min, Max for a column
// ============================================
type ColumnStats = {
  count: number;       // Cells that have a value
  empty: number;       // Cells that are empty
  numeric: boolean;    // Are most cells numbers?
  sum: number;
  avg: number;
  min: number;
  max: number;
  uniqueCount?: number; // For text columns: how many unique values
};

function computeColumnStats(data: (string | number | boolean | null)[][], colIndex: number): ColumnStats {
  // Collect all non-empty values from this column
  const values = data
    .map((row) => row[colIndex])
    .filter((value) => value !== "" && value !== null && value !== undefined);

  // Try to convert each value to a number
  const numbers = values
    .map((value) => parseFloat(String(value)))
    .filter((n) => !isNaN(n) && isFinite(n));

  // If most of the filled values are numbers, treat as numeric column
  const isNumeric = numbers.length > 0 && numbers.length >= values.length * 0.7;

  const stats: ColumnStats = {
    count: values.length,
    empty: data.length - values.length,
    numeric: isNumeric,
    sum: 0,
    avg: 0,
    min: 0,
    max: 0,
  };

  if (isNumeric && numbers.length > 0) {
    stats.sum = numbers.reduce((a, b) => a + b, 0);
    stats.avg = stats.sum / numbers.length;
    stats.min = Math.min(...numbers);
    stats.max = Math.max(...numbers);
  } else {
    // Text column — count unique values
    const unique = new Set(values.map((v) => String(v).toLowerCase().trim()));
    stats.uniqueCount = unique.size;
  }

  return stats;
}

// Format a number nicely (rounds to 2 decimals, adds thousands separators)
function formatNumber(value: number): string {
  if (!isFinite(value)) return "—";
  // For whole numbers, don't show decimals
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  // For decimals, show up to 2 places
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ============================================
// STAT ROW — A single label-value pair inside a column stats card
// ============================================
function StatRow({
  label,
  value,
  warning,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-semibold ${warning ? "text-amber-400" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

// ============================================
// TOOLBAR BUTTON — A single button in the Excel-style toolbar
// ============================================
function ToolbarButton({
  onClick,
  icon,
  label,
  disabled,
  danger,
  title,
}: {
  onClick: () => void;
  icon: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-500/30 bg-red-500/5 text-red-300 hover:border-red-500/50 hover:bg-red-500/15"
          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200"
      }`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================
// INSIGHT SECTION — One color-coded category in the AI panel
// Used for Anomalies, Patterns, Data Quality, Recommendations
// ============================================
function InsightSection({
  icon,
  title,
  color,
  items,
}: {
  icon: string;
  title: string;
  color: "red" | "purple" | "amber" | "cyan";
  items: string[];
}) {
  const colorClasses = {
    red: {
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      heading: "text-red-300",
      bullet: "text-red-400",
    },
    purple: {
      border: "border-purple-500/30",
      bg: "bg-purple-500/10",
      heading: "text-purple-300",
      bullet: "text-purple-400",
    },
    amber: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      heading: "text-amber-300",
      bullet: "text-amber-400",
    },
    cyan: {
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/10",
      heading: "text-cyan-300",
      bullet: "text-cyan-400",
    },
  };
  const c = colorClasses[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <h3 className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${c.heading}`}>
        <span className="text-base">{icon}</span>
        <span>{title}</span>
        <span className="ml-auto rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] text-slate-400">
          {items.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-200">
            <span className={`mt-1 ${c.bullet}`}>●</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// FORMAT AI ANALYSIS AS PLAIN TEXT
// Turns the structured AI analysis into a clean, paste-able text block.
// Output looks great in emails, Slack, Notion, Word — anywhere.
// ============================================
type AIAnalysisForExport = {
  summary: string;
  anomalies: string[];
  patterns: string[];
  data_quality: string[];
  recommendations: string[];
};

function formatAnalysisAsPlainText(
  analysis: AIAnalysisForExport,
  filename: string
): string {
  const lines: string[] = [];

  // Header block
  lines.push("══════════════════════════════════════════════");
  lines.push("       ChronoSheet AI Analysis");
  lines.push("══════════════════════════════════════════════");
  lines.push(`File: ${filename}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");

  // Summary
  if (analysis.summary) {
    lines.push("📋 SUMMARY");
    lines.push("──────────────────────");
    lines.push(analysis.summary);
    lines.push("");
  }

  // Anomalies
  if (analysis.anomalies && analysis.anomalies.length > 0) {
    lines.push("🚨 ANOMALIES");
    lines.push("──────────────────────");
    analysis.anomalies.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item}`);
    });
    lines.push("");
  }

  // Patterns
  if (analysis.patterns && analysis.patterns.length > 0) {
    lines.push("🔍 PATTERNS");
    lines.push("──────────────────────");
    analysis.patterns.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item}`);
    });
    lines.push("");
  }

  // Data Quality
  if (analysis.data_quality && analysis.data_quality.length > 0) {
    lines.push("⚠️ DATA QUALITY");
    lines.push("──────────────────────");
    analysis.data_quality.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item}`);
    });
    lines.push("");
  }

  // Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    lines.push("💡 RECOMMENDATIONS");
    lines.push("──────────────────────");
    analysis.recommendations.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item}`);
    });
    lines.push("");
  }

  // Footer
  lines.push("══════════════════════════════════════════════");
  lines.push("Generated by ChronoSheet");
  lines.push("Spreadsheets That Remember.");
  lines.push("══════════════════════════════════════════════");

  return lines.join("\n");
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
