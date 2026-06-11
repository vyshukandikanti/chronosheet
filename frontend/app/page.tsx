// ChronoSheet — Home Page
// =========================
// Client component for interactive features:
//   - Upload button that opens a file picker
//   - Live spreadsheet editing (click any cell to edit)
//   - Change tracking with visual highlights
//   - Save Snapshot button (will wire to backend next phase)

"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Link from "next/link";
import BackendStatus from "./components/BackendStatus";
import AuthBadge from "./components/AuthBadge";
import OnlineUsers from "./components/OnlineUsers";
import { useAuth } from "./lib/AuthProvider";
import {
  useLiveSnapshots,
  broadcastNewSnapshot,
  type LiveSnapshot,
} from "./lib/useLiveSnapshots";
import {
  useLiveCellEdits,
  broadcastCellEdit,
  type CellEdit,
} from "./lib/useLiveCellEdits";

// The shape of the response we get from the backend after upload
type CellValue = string | number | boolean | null;
type SheetMatrix = CellValue[][];

type SheetInfo = {
  name: string;
  row_count: number;
  column_count: number;
  data: SheetMatrix;
  skipped_top?: number;
  skipped_bottom?: number;
};

type SpreadsheetData = {
  success: boolean;
  filename: string;
  sheet_name: string;
  row_count: number;
  column_count: number;
  data: SheetMatrix;
  message: string;
  sheets?: SheetInfo[];  // All sheets in the workbook
};

// Backend URL — uses NEXT_PUBLIC_BACKEND_URL env var when deployed,
// falls back to localhost during local development.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

  // ===== AUTH STATE =====
  // Read who is signed in. The upload button is gated behind login.
  const { user: authUser, loading: authLoading } = useAuth();
  // Controls the "Please sign in to upload" modal
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ===== USER IDENTITY (persists in browser) =====
  // Who is editing? Stored in localStorage so it persists across visits.
  const [userName, setUserName] = useState<string>("");
  // Is the "Welcome — what's your name?" modal showing?
  const [showNameModal, setShowNameModal] = useState(false);
  // The text the user is typing in the name modal
  const [nameInput, setNameInput] = useState("");

  // ===== THEME (Dark / Light mode) =====
  type Theme = "dark" | "light";
  const [theme, setTheme] = useState<Theme>("dark");

  // Load theme from localStorage on first render
  useEffect(() => {
    const stored = localStorage.getItem("chronosheet-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  // Apply theme class to the document root whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
  }, [theme]);

  // Toggle handler
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("chronosheet-theme", next);
  };

  // On first load: try to read name from localStorage.
  // If empty, show the name prompt modal.
  useEffect(() => {
    const stored = localStorage.getItem("chronosheet-user-name");
    if (stored && stored.trim() !== "") {
      setUserName(stored);
    } else {
      setShowNameModal(true);
    }
  }, []);

  // Save the name to state AND localStorage so it persists forever
  const saveUserName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    localStorage.setItem("chronosheet-user-name", trimmed);
    setShowNameModal(false);
    setNameInput("");
  };

  // ===== HANDLERS =====
  const handleUploadClick = () => {
    // GATE: Require login before opening the file picker.
    // If the user isn't signed in, show a friendly prompt instead.
    if (!authLoading && !authUser) {
      setShowLoginPrompt(true);
      return;
    }
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
    return (
      <SpreadsheetView
        data={spreadsheet}
        onReset={handleReset}
        userName={userName}
        onChangeName={() => {
          setNameInput(userName);
          setShowNameModal(true);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
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
          {/* No room joined on the landing page — only inside a spreadsheet */}
          <BackendStatus />
          <AuthBadge />
          <button
            onClick={toggleTheme}
            className="rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
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
              ) : !authLoading && !authUser ? (
                <>
                  <span>🔒</span>
                  <span>Sign in to Upload</span>
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

      {/* ======================================== */}
      {/* FEATURES SHOWCASE — BENTO GRID (Apple-style) */}
      {/* ======================================== */}
      <section className="relative z-10 mx-auto max-w-7xl px-8 py-20">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            ✨ Powerful Features
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Everything you need,{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              in one place
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Edit, analyze, visualize, and time-travel through your data — all in your browser.
          </p>
        </div>

        {/* Bento grid — varying card sizes for visual interest */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[180px]">

          {/* FEATURED — Time Machine (2x2 big card with mini timeline) */}
          <BentoFeatured
            icon="🕐"
            title="Time Machine"
            description="Save snapshots of any version. Travel back to see exactly how your data looked at any moment — like Git for spreadsheets."
            accent="emerald"
          />

          {/* AI Chat — wide card (2x1) */}
          <BentoWide
            icon="🤖"
            title="Chat With Your Spreadsheet"
            description="Ask questions in plain English. AI reads your data and answers in seconds."
            accent="purple"
          />

          {/* Voice — small card */}
          <BentoSmall
            icon="🎤"
            title="Voice Queries"
            description="Speak your questions. AI listens & answers."
            accent="cyan"
          />

          {/* Visual Diff — small card */}
          <BentoSmall
            icon="🔍"
            title="Visual Diff"
            description="Changed cells glow yellow in time-travel mode."
            accent="yellow"
          />

          {/* Charts — wide card */}
          <BentoWide
            icon="📊"
            title="Auto-Generate Charts"
            description="One click. AI picks the perfect chart type and renders it instantly."
            accent="amber"
          />

          {/* Excel-Style — small */}
          <BentoSmall
            icon="✏️"
            title="Excel-Style Editing"
            description="Toolbar, shortcuts, freeze panes."
            accent="emerald"
          />

          {/* Multi-Sheet — small */}
          <BentoSmall
            icon="📑"
            title="Multi-Sheet"
            description="All your tabs work natively."
            accent="cyan"
          />

          {/* Export — wide */}
          <BentoWide
            icon="📥"
            title="Export to Excel"
            description="Download your edits as a fresh .xlsx with timestamp and branding."
            accent="purple"
          />

          {/* Dark/Light — wide */}
          <BentoWide
            icon="🌗"
            title="Dark & Light Themes"
            description="Toggle between elegant dark and crisp light modes — your choice persists."
            accent="slate"
          />

        </div>
      </section>

      <footer className="relative z-10 px-8 py-8 text-center text-sm text-slate-600">
        Excel forgets. ChronoSheet remembers.
      </footer>

      {/* NAME PROMPT MODAL — appears on first visit (or when changing name) */}
      {showNameModal && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-500/30 bg-slate-950 shadow-2xl">
            <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👋</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {userName ? "Change your name" : "Welcome to ChronoSheet!"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {userName
                      ? "Update the name attached to your snapshots"
                      : "Tell us who's editing so we can track who saved what"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Your name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && nameInput.trim()) {
                    saveUserName(nameInput);
                  }
                }}
                placeholder="e.g., Priya, Ravi, or your team name"
                autoFocus
                maxLength={50}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="mt-2 text-xs text-slate-500">
                Saved in your browser only. You can change it anytime.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900/50 px-6 py-3">
              {userName && (
                <button
                  onClick={() => {
                    setShowNameModal(false);
                    setNameInput("");
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => saveUserName(nameInput)}
                disabled={!nameInput.trim()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== LOGIN-REQUIRED MODAL ===== */}
      {/* Shown when a guest clicks "Upload Spreadsheet" */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
            <div className="text-center">
              <div className="mb-4 text-5xl">🔒</div>
              <h2 className="mb-2 text-2xl font-bold text-white">
                Sign in to continue
              </h2>
              <p className="mb-6 text-sm text-slate-400">
                Uploading a spreadsheet requires an account so we can save
                your snapshots and connect them to YOU forever.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 font-semibold text-white transition"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Create a free account
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-700 hover:border-emerald-500/40 hover:text-emerald-300 px-4 py-2.5 font-medium text-slate-300 transition"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Sign in instead
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLoginPrompt(false)}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// SPREADSHEET VIEW — Now with EDITING SUPPORT
// ============================================
function SpreadsheetView({
  data,
  onReset,
  userName,
  onChangeName,
  theme,
  onToggleTheme,
}: {
  data: SpreadsheetData;
  onReset: () => void;
  userName: string;
  onChangeName: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  // ------ Multi-sheet state ------
  // Which sheet (tab) is currently active?
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  // Sheets available (from upload). Falls back to a single sheet if none provided.
  const availableSheets: SheetInfo[] = data.sheets ?? [{
    name: data.sheet_name,
    row_count: data.row_count,
    column_count: data.column_count,
    data: data.data,
  }];
  const activeSheet = availableSheets[activeSheetIndex] ?? availableSheets[0];

  // Per-sheet edited data cache so switching sheets preserves edits
  const [sheetEditsCache, setSheetEditsCache] = useState<{ [name: string]: SheetMatrix }>({});
  // Per-sheet modified cells cache
  const [sheetModifiedCache, setSheetModifiedCache] = useState<{ [name: string]: Set<string> }>({});

  // A mutable copy of the active sheet's data
  const [editedData, setEditedData] = useState<SheetMatrix>(() =>
    activeSheet.data.map((row) => [...row])
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

  // ------ Wave 2: Save Snapshot Modal (with optional note) ------
  // Is the "Save Snapshot" modal open?
  const [showSaveModal, setShowSaveModal] = useState(false);
  // The note the user types in the modal
  const [snapshotNote, setSnapshotNote] = useState("");

  // ------ Wave 2: Export to Excel state ------
  const [exporting, setExporting] = useState(false);

  // ------ Wave 3: Chat with Spreadsheet state ------
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatThinking, setChatThinking] = useState(false);

  // ------ Wave 3: Voice queries (Web Speech API) ------
  // Is the mic actively listening?
  const [isListening, setIsListening] = useState(false);
  // Browser support check
  const [voiceSupported, setVoiceSupported] = useState(false);
  // Reference to the SpeechRecognition instance
  const speechRecognitionRef = useRef<unknown>(null);

  // ------ Wave 3: Auto-generate Charts state ------
  type ChartType = "bar" | "line" | "pie" | "area";
  type ChartSuggestion = {
    chart_type: ChartType;
    title: string;
    x_column: number;
    y_column: number;
    x_label: string;
    y_label: string;
    reasoning: string;
  };
  const [showCharts, setShowCharts] = useState(false);
  const [generatingChart, setGeneratingChart] = useState(false);
  const [chartSuggestion, setChartSuggestion] = useState<ChartSuggestion | null>(null);
  const [chartTypeOverride, setChartTypeOverride] = useState<ChartType | null>(null);

  // ------ Wave 2: AI Compare state ------
  type CompareAnalysis = {
    summary: string;
    key_changes: string[];
    patterns: string[];
    impact: string[];
  };
  type CompareResult = {
    total_changes: number;
    structural_change: boolean;
    past_label: string;
    current_label: string;
    diffs_sample: { cell: string; past: string; current: string }[];
    analysis: CompareAnalysis;
  };
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ------ Wave 1: Excel-style features ------
  // The most recently clicked cell — used as the "context" for insert/delete operations
  const [lastActive, setLastActive] = useState<{ row: number; col: number } | null>(null);
  // What the user typed in the search bar (live highlights matching cells)
  const [searchQuery, setSearchQuery] = useState("");

  // ------ Multi-row selection (Excel-style) ------
  // Set of row indices that are currently selected
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  // The last row clicked — used as anchor for Shift+click range selection
  const [lastClickedRowForRange, setLastClickedRowForRange] = useState<number | null>(null);
  // Is the user currently dragging to select multiple rows?
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  // The row where drag started
  const [dragStartRow, setDragStartRow] = useState<number | null>(null);
  // Which column is currently sorted (null = no sort, original order)
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  // Direction of sort: "asc" (smallest first) or "desc" (largest first)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Snapshot of the data BEFORE any sorting started.
  // This lets us "unsort" and return to the original row order.
  const [preSortOrder, setPreSortOrder] = useState<SheetMatrix | null>(null);
  // Is the Statistics panel open?
  const [showStats, setShowStats] = useState(false);

  // ------ Freeze panes (Excel-style) ------
  // How many rows from the top should stay visible while scrolling?
  const [frozenRows, setFrozenRows] = useState(0);
  // How many columns from the left should stay visible while scrolling?
  const [frozenColumns, setFrozenColumns] = useState(0);

  // Load freeze preferences from localStorage
  useEffect(() => {
    const r = localStorage.getItem("chronosheet-frozen-rows");
    const c = localStorage.getItem("chronosheet-frozen-columns");
    if (r && !isNaN(parseInt(r))) setFrozenRows(parseInt(r));
    if (c && !isNaN(parseInt(c))) setFrozenColumns(parseInt(c));
  }, []);

  const handleFreezeRowsChange = (n: number) => {
    setFrozenRows(n);
    localStorage.setItem("chronosheet-frozen-rows", String(n));
  };

  const handleFreezeColumnsChange = (n: number) => {
    setFrozenColumns(n);
    localStorage.setItem("chronosheet-frozen-columns", String(n));
  };
  // How dates should be displayed throughout the table
  type DateFormat = "iso" | "dmy" | "mdy" | "short" | "long";
  // Default to DD/MM/YYYY (most natural for India and Europe)
  const [dateFormat, setDateFormat] = useState<DateFormat>("dmy");

  // Load user's preferred date format from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("chronosheet-date-format") as DateFormat | null;
    if (stored && ["iso", "dmy", "mdy", "short", "long"].includes(stored)) {
      setDateFormat(stored);
    }
  }, []);

  // Update format and persist the choice so it sticks across visits
  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
    localStorage.setItem("chronosheet-date-format", newFormat);
  };

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
    author?: string;
  };
  const [snapshotsList, setSnapshotsList] = useState<SnapshotSummary[]>([]);

  // Is the history panel open?
  const [showHistory, setShowHistory] = useState(false);

  // Phase 4 — unread indicator: red dot on the History button when
  // another user saves a snapshot AND our panel is closed. Cleared
  // the moment the user opens the panel.
  const [hasUnseenSnapshots, setHasUnseenSnapshots] = useState(false);

  // ====================================================
  // PHASE 4 — LIVE SNAPSHOT UPDATES
  // ====================================================
  // Subscribe to the broadcast channel for this filename. When ANOTHER
  // user saves a snapshot on the same file, we receive it here and
  // prepend it to our list — no refresh, no refetch.
  useLiveSnapshots(data.filename, (snapshot: LiveSnapshot) => {
    setSnapshotsList((prev) => {
      // Guard against duplicates (e.g. if we somehow receive our own broadcast)
      if (prev.some((s) => s.id === snapshot.id)) return prev;
      // Backend list is in chronological order; new snapshot goes at the end
      const incoming: SnapshotSummary = {
        id: snapshot.id,
        filename: snapshot.filename,
        sheet_name: snapshot.sheet_name ?? "",
        saved_at: snapshot.saved_at,
        row_count: snapshot.row_count ?? 0,
        column_count: snapshot.column_count ?? 0,
        changes_from_previous: snapshot.changes_from_previous ?? 0,
        note: snapshot.note ?? null,
        author: snapshot.author ?? "Anonymous",
      };
      return [...prev, incoming];
    });
    // Brief notification so the user sees that someone else just saved
    setToast({
      kind: "success",
      text: `🆕 ${snapshot.author || "Someone"} just saved a snapshot!`,
    });
    setTimeout(() => setToast(null), 4000);
    // Light up the red dot if the panel isn't currently open
    setHasUnseenSnapshots((prev) => prev || !showHistory);
  });

  // ====================================================
  // PHASE 5 — LIVE CELL EDITS
  // ====================================================
  // Set of "row-col" keys that just changed due to a remote edit.
  // Used to briefly pulse the cell so users notice live changes.
  const [remotelyEditedCells, setRemotelyEditedCells] = useState<Set<string>>(
    new Set(),
  );

  // Subscribe to live cell edits from other users on this filename.
  useLiveCellEdits(data.filename, (edit: CellEdit) => {
    // Apply the edit to our local data
    setEditedData((previous) => {
      // Bounds check — guard against stale broadcasts
      if (edit.row < 0 || edit.row >= previous.length) return previous;
      const targetRow = previous[edit.row];
      if (!targetRow || edit.col < 0 || edit.col >= targetRow.length) {
        return previous;
      }
      return previous.map((rowArr, rowIndex) =>
        rowIndex === edit.row
          ? rowArr.map((cellValue, colIndex) =>
              colIndex === edit.col ? edit.value : cellValue,
            )
          : rowArr,
      );
    });

    // Pulse the cell briefly so the change catches the eye
    const cellKey = `${edit.row}-${edit.col}`;
    setRemotelyEditedCells((prev) => {
      const next = new Set(prev);
      next.add(cellKey);
      return next;
    });
    setTimeout(() => {
      setRemotelyEditedCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }, 1500);
  });
  // If we are viewing a past snapshot, this holds its ID. Null means "current".
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  // The data of the snapshot being viewed (so we can show it instead of edited data)
  const [viewingSnapshotData, setViewingSnapshotData] = useState<SheetMatrix | null>(null);
  // Are we currently fetching a snapshot from the backend?
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  // Tracks which snapshot's share link was just copied — for "Copied!" feedback
  const [copiedSnapshotId, setCopiedSnapshotId] = useState<string | null>(null);

  // ------ Arrow key navigation (like Excel) ------
  // Press ↑ ↓ ← → to move the active cell.
  // Press Enter to start editing the active cell.
  useEffect(() => {
    const handleArrowKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Skip when typing in any input — arrows there should move the text cursor
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // No navigation in time-travel mode
      if (viewingSnapshotId !== null) return;

      const maxRow = editedData.length - 1;
      const maxCol = (editedData[0]?.length ?? 1) - 1;

      // Treat (0,0) as the starting point if nothing is active yet
      const currentRow = lastActive?.row ?? 0;
      const currentCol = lastActive?.col ?? 0;
      let newRow = currentRow;
      let newCol = currentCol;

      switch (event.key) {
        case "ArrowDown":
          newRow = Math.min(maxRow, currentRow + 1);
          break;
        case "ArrowUp":
          newRow = Math.max(0, currentRow - 1);
          break;
        case "ArrowRight":
          newCol = Math.min(maxCol, currentCol + 1);
          break;
        case "ArrowLeft":
          newCol = Math.max(0, currentCol - 1);
          break;
        case "Enter":
        case "F2": {
          // Start editing the active cell
          if (lastActive) {
            event.preventDefault();
            startEditing(currentRow, currentCol);
          }
          return;
        }
        default:
          return;
      }

      // Only update if position actually changed (or we had no active cell)
      if (newRow !== currentRow || newCol !== currentCol || !lastActive) {
        event.preventDefault();
        setLastActive({ row: newRow, col: newCol });
      }
    };

    document.addEventListener("keydown", handleArrowKeys);
    return () => document.removeEventListener("keydown", handleArrowKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastActive, editedData, viewingSnapshotId]);

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
      } else if (event.key === "Escape" && selectedRows.size > 0) {
        // Escape: clear row selection
        event.preventDefault();
        clearRowSelection();
      } else if (event.key === "Delete" && selectedRows.size > 0) {
        // Delete key: remove all selected rows
        event.preventDefault();
        deleteSelectedRows();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, redoStack, editedData, modifiedCells, viewingSnapshotId, selectedRows]);

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

    // ====================================================
    // PHASE 5 — Broadcast this edit to other viewers
    // ====================================================
    // Only broadcast if the value actually changed (don't spam the channel)
    if (inputValue !== previousCellValue && data.filename) {
      broadcastCellEdit(data.filename, {
        row,
        col,
        value: inputValue,
        author: userName || "Anonymous",
        editedAt: new Date().toISOString(),
        sheetName: data.sheet_name,
      }).catch((error) => {
        console.warn("[Phase 5] Cell edit broadcast failed:", error);
      });
    }

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

  // Excel-style: while editing, these keys save AND move to the next cell.
  // - Enter / Down arrow → save + move down
  // - Shift+Enter / Up arrow → save + move up
  // - Tab / Right arrow → save + move right
  // - Shift+Tab / Left arrow → save + move left
  // - Escape → cancel without saving
  const handleInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!editingCell) return;

    const { row, col } = editingCell;
    const maxRow = editedData.length - 1;
    const maxCol = (editedData[0]?.length ?? 1) - 1;

    let direction: "down" | "up" | "right" | "left" | null = null;

    switch (event.key) {
      case "Enter":
        direction = event.shiftKey ? "up" : "down";
        break;
      case "Tab":
        direction = event.shiftKey ? "left" : "right";
        break;
      case "ArrowDown":
        direction = "down";
        break;
      case "ArrowUp":
        direction = "up";
        break;
      case "ArrowRight":
        direction = "right";
        break;
      case "ArrowLeft":
        direction = "left";
        break;
      case "Escape":
        event.preventDefault();
        cancelEdit();
        return;
      default:
        return; // Let normal typing happen
    }

    event.preventDefault();
    saveEdit();

    // Compute the next cell's position
    let newRow = row;
    let newCol = col;
    switch (direction) {
      case "down":
        newRow = Math.min(maxRow, row + 1);
        break;
      case "up":
        newRow = Math.max(0, row - 1);
        break;
      case "right":
        newCol = Math.min(maxCol, col + 1);
        break;
      case "left":
        newCol = Math.max(0, col - 1);
        break;
    }

    setLastActive({ row: newRow, col: newCol });
  };

  const discardAllChanges = () => {
    setEditedData(activeSheet.data.map((row) => [...row]));
    setModifiedCells(new Set());
    setEditingCell(null);
    setLastActive(null);
  };

  // ------ Switch between sheets (preserves edits per sheet) ------
  const switchToSheet = (newIndex: number) => {
    if (newIndex === activeSheetIndex) return;
    const currentSheetName = activeSheet.name;
    const newSheet = availableSheets[newIndex];
    if (!newSheet) return;

    // Save the current sheet's edits into the cache
    setSheetEditsCache((prev) => ({
      ...prev,
      [currentSheetName]: editedData.map((row) => [...row]),
    }));
    setSheetModifiedCache((prev) => ({
      ...prev,
      [currentSheetName]: new Set(modifiedCells),
    }));

    // Switch active sheet index
    setActiveSheetIndex(newIndex);

    // Load the new sheet's data: either from cache (if user has edited it) or fresh
    const cachedEdits = sheetEditsCache[newSheet.name];
    const cachedModified = sheetModifiedCache[newSheet.name];
    setEditedData(cachedEdits ?? newSheet.data.map((row) => [...row]));
    setModifiedCells(cachedModified ?? new Set());

    // Reset per-sheet UI state
    setEditingCell(null);
    setLastActive(null);
    setUndoStack([]);
    setRedoStack([]);
    setSortColumn(null);
    setSortDirection("asc");
    setPreSortOrder(null);
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

  // ------ Multi-row selection handlers ------

  // Handle mousedown on a row number — starts drag selection too
  const handleRowNumberMouseDown = (rowIndex: number, event: React.MouseEvent) => {
    if (isReadOnly) return;

    if (event.shiftKey && lastClickedRowForRange !== null) {
      // Range selection from anchor
      const start = Math.min(lastClickedRowForRange, rowIndex);
      const end = Math.max(lastClickedRowForRange, rowIndex);
      const newSelection = new Set(selectedRows);
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedRows(newSelection);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle individual row
      const newSelection = new Set(selectedRows);
      if (newSelection.has(rowIndex)) {
        newSelection.delete(rowIndex);
      } else {
        newSelection.add(rowIndex);
      }
      setSelectedRows(newSelection);
      setLastClickedRowForRange(rowIndex);
    } else {
      // Plain click — select just this row AND start drag-select
      setSelectedRows(new Set([rowIndex]));
      setLastClickedRowForRange(rowIndex);
      setIsDragSelecting(true);
      setDragStartRow(rowIndex);
    }
  };

  // Handle mouse entering a row number while dragging — extend range
  const handleRowNumberMouseEnter = (rowIndex: number) => {
    if (!isDragSelecting || dragStartRow === null) return;
    const start = Math.min(dragStartRow, rowIndex);
    const end = Math.max(dragStartRow, rowIndex);
    const newSelection = new Set<number>();
    for (let i = start; i <= end; i++) {
      newSelection.add(i);
    }
    setSelectedRows(newSelection);
  };

  // Global mouseup handler — stops drag selection wherever it ends
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragSelecting) {
        setIsDragSelecting(false);
        setDragStartRow(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isDragSelecting]);

  // Compute live stats for the selected rows (Sum, Average, Count of numeric cells)
  const selectionStats = useMemo(() => {
    if (selectedRows.size === 0) return null;
    let sum = 0;
    let numericCount = 0;
    let cellCount = 0;
    for (const rowIdx of selectedRows) {
      const row = editedData[rowIdx];
      if (!row) continue;
      for (const cell of row) {
        if (cell === null || cell === undefined || String(cell).trim() === "") continue;
        cellCount++;
        const num = parseFloat(String(cell));
        if (!isNaN(num) && isFinite(num)) {
          sum += num;
          numericCount++;
        }
      }
    }
    return {
      rows: selectedRows.size,
      cells: cellCount,
      sum,
      average: numericCount > 0 ? sum / numericCount : 0,
      numericCount,
    };
  }, [selectedRows, editedData]);

  // Delete all currently selected rows in one undoable action
  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    captureSnapshot();

    const cleaned = editedData.filter((_, index) => !selectedRows.has(index));
    setEditedData(cleaned);
    setModifiedCells(new Set()); // Indices shifted
    setEditingCell(null);
    setLastActive(null);

    const count = selectedRows.size;
    setSelectedRows(new Set());
    setLastClickedRowForRange(null);

    setToast({
      kind: "success",
      text: `Deleted ${count} row${count > 1 ? "s" : ""}. Press Ctrl+Z to undo.`,
    });
    setTimeout(() => setToast(null), 4000);
  };

  // Clear all selected rows
  const clearRowSelection = () => {
    setSelectedRows(new Set());
    setLastClickedRowForRange(null);
  };

  // Select all rows
  const selectAllRows = () => {
    const allIndices = editedData.map((_, idx) => idx);
    setSelectedRows(new Set(allIndices));
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
  // Accepts an optional note that gets stored with the snapshot.
  const handleSaveSnapshot = async (note: string | null = null) => {
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
          note: note && note.trim() !== "" ? note.trim() : null,
          author: userName || "Anonymous",
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

      // ====================================================
      // PHASE 4 — Broadcast to other viewers of the same file
      // ====================================================
      // Anyone else with this filename open receives this snapshot
      // and prepends it to their history list — live, no refresh.
      const broadcastPayload: LiveSnapshot = {
        id: result.snapshot_id,
        filename: data.filename,
        sheet_name: data.sheet_name,
        saved_at: result.saved_at,
        author: userName || "Anonymous",
        note: note && note.trim() !== "" ? note.trim() : null,
        changes_from_previous: modifiedCells.size,
        row_count: editedData.length,
        column_count: editedData[0]?.length ?? 0,
      };
      // Don't await — fire-and-forget so saving feels instant
      broadcastNewSnapshot(data.filename, broadcastPayload).catch((error) => {
        console.warn("[Phase 4] Snapshot broadcast failed:", error);
      });

      // Also add to our OWN list immediately (the broadcast only
      // notifies other tabs; our own state needs to be set here).
      setSnapshotsList((prev) => {
        if (prev.some((s) => s.id === result.snapshot_id)) return prev;
        return [
          ...prev,
          {
            id: result.snapshot_id,
            filename: data.filename,
            sheet_name: data.sheet_name,
            saved_at: result.saved_at,
            row_count: editedData.length,
            column_count: editedData[0]?.length ?? 0,
            changes_from_previous: modifiedCells.size,
            note: note && note.trim() !== "" ? note.trim() : null,
            author: userName || "Anonymous",
          },
        ];
      });
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

  // ------ Wave 2: Export to Excel handler ------
  // Sends the current edited data to the backend, which builds a fresh
  // .xlsx file and streams it back. We trigger a browser download.
  const handleExportExcel = async () => {
    setExporting(true);
    setToast(null);

    try {
      const response = await fetch(`${BACKEND_URL}/export-spreadsheet`, {
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
            : "Could not export the file.";
        throw new Error(detail);
      }

      // Pull the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const downloadName =
        filenameMatch?.[1] ||
        `${data.filename.replace(/\.xlsx$/i, "")}_edited.xlsx`;

      // Get the file as a binary blob and trigger the browser download
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setToast({
        kind: "success",
        text: `Excel file downloaded: ${downloadName}`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setExporting(false);
    }
  };

  // ------ Wave 3: Chat with Spreadsheet handler ------
  // Sends user question + spreadsheet data + chat history to backend.
  // Gets back AI's answer and adds it to the chat thread.
  // Accepts an optional override text (used by voice queries).
  const handleSendChatMessage = async (overrideText?: string) => {
    const question = (overrideText ?? chatInput).trim();
    if (!question || chatThinking) return;

    // Optimistically add user message to the thread
    const newUserMsg: ChatMessage = { role: "user", content: question };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatThinking(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat-with-spreadsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          sheet_name: data.sheet_name,
          data: viewingSnapshotData ?? editedData,
          question: question,
          history: chatMessages,  // Send the conversation context
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const detail =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "Chat failed.";
        throw new Error(detail);
      }

      const result = await response.json();
      const aiMsg: ChatMessage = { role: "assistant", content: result.answer };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reach AI.";
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `⚠️ Sorry, I had trouble: ${message}`,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatThinking(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatInput("");
  };

  // ------ Wave 3: Voice query — Web Speech API setup ------
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Browsers expose this as either `SpeechRecognition` or `webkitSpeechRecognition`.
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);

    type Recognition = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: (event: { results: { 0: { 0: { transcript: string } } }[] }) => void;
      onerror: (event: { error: string }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };

    const recognition = new SpeechRecognitionAPI() as Recognition;
    recognition.continuous = false; // Stop listening once user finishes speaking
    recognition.interimResults = false; // Only return final result
    recognition.lang = "en-IN"; // English India (you can change to "en-US", "hi-IN", etc.)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      setIsListening(false);
      // Auto-send the transcribed text after a brief moment
      setTimeout(() => {
        handleSendChatMessage(transcript);
      }, 300);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const friendlyError =
        event.error === "not-allowed"
          ? "Microphone permission denied. Allow access in browser settings."
          : event.error === "no-speech"
            ? "No speech detected. Try speaking louder."
            : `Voice error: ${event.error}`;
      setToast({ kind: "error", text: friendlyError });
      setTimeout(() => setToast(null), 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start listening for voice input
  const startVoiceQuery = () => {
    if (!voiceSupported || !speechRecognitionRef.current) {
      setToast({
        kind: "error",
        text: "Voice input not supported in this browser. Try Chrome or Edge.",
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setChatInput("");
    setIsListening(true);
    try {
      (speechRecognitionRef.current as { start: () => void }).start();
    } catch {
      // Already started — ignore
      setIsListening(false);
    }
  };

  // Manually stop listening (if user clicks the mic again)
  const stopVoiceQuery = () => {
    if (speechRecognitionRef.current) {
      try {
        (speechRecognitionRef.current as { stop: () => void }).stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  };

  // ------ Wave 3: Generate Chart handler ------
  // Asks the AI to pick the best chart type and columns for visualization.
  const handleGenerateChart = async () => {
    setGeneratingChart(true);
    setShowCharts(true);
    setChartSuggestion(null);
    setChartTypeOverride(null);
    setToast(null);

    try {
      const response = await fetch(`${BACKEND_URL}/suggest-chart`, {
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
            : "Could not generate chart.";
        throw new Error(detail);
      }

      const result = await response.json();
      setChartSuggestion(result.suggestion);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Chart generation failed.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 4000);
      setShowCharts(false);
    } finally {
      setGeneratingChart(false);
    }
  };

  // ------ Wave 2: AI Compare handler ------
  // Sends the past snapshot data + current edited data to the backend,
  // which uses Groq to produce a story of what changed.
  const handleAICompare = async () => {
    if (!viewingSnapshotData || !viewingSnapshot) return;

    setComparing(true);
    setShowCompareModal(true);
    setCompareResult(null);
    setToast(null);

    try {
      const response = await fetch(`${BACKEND_URL}/compare-snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          sheet_name: data.sheet_name,
          past_data: viewingSnapshotData,
          current_data: editedData,
          past_label: `Snapshot from ${formatTimestamp(viewingSnapshot.saved_at)} by ${viewingSnapshot.author || "Anonymous"}`,
          current_label: "Current (editable) version",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const detail =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "AI compare failed.";
        throw new Error(detail);
      }

      const result = await response.json();
      setCompareResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not compare with AI.";
      setToast({ kind: "error", text: message });
      setTimeout(() => setToast(null), 5000);
      setShowCompareModal(false);
    } finally {
      setComparing(false);
    }
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

  // ------ Wave 2: Visual Diff between snapshot and current ------
  // When viewing a past snapshot, compute which cells differ from the
  // current edited data. These cells get highlighted yellow.
  const { diffCells, currentValuesMap } = useMemo(() => {
    const diff = new Set<string>();
    const currentMap = new Map<string, string>();

    if (!viewingSnapshotData) {
      return { diffCells: diff, currentValuesMap: currentMap };
    }

    const rowsToCompare = Math.min(viewingSnapshotData.length, editedData.length);
    const colsToCompare = Math.min(
      viewingSnapshotData[0]?.length ?? 0,
      editedData[0]?.length ?? 0
    );

    for (let r = 0; r < rowsToCompare; r++) {
      for (let c = 0; c < colsToCompare; c++) {
        const past = String(viewingSnapshotData[r][c] ?? "");
        const current = String(editedData[r][c] ?? "");
        if (past !== current) {
          const key = `${r}-${c}`;
          diff.add(key);
          currentMap.set(key, current);
        }
      }
    }

    return { diffCells: diff, currentValuesMap: currentMap };
  }, [viewingSnapshotData, editedData]);

  // Structural differences (different row/column count) — useful for the banner
  const structureChanged = viewingSnapshotData
    ? viewingSnapshotData.length !== editedData.length ||
      (viewingSnapshotData[0]?.length ?? 0) !== (editedData[0]?.length ?? 0)
    : false;
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

            {/* ONLINE USERS — live presence indicator (Phase 3 — Real-Time) */}
            {/* Channel = filename, so two people opening the same filename see each other */}
            <OnlineUsers channelKey={data.filename || null} />

            {/* AUTH BADGE — Sign in / Sign up when logged out, profile + Sign out when logged in */}
            <AuthBadge />

            {/* THEME TOGGLE — sun/moon icon switches dark and light */}
            <button
              onClick={onToggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-base hover:border-emerald-500/40"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* USER NAME BADGE — click to change name */}
            {userName && (
              <button
                onClick={onChangeName}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                title="Click to change your name"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span>{userName}</span>
              </button>
            )}

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
                  onClick={() => {
                    setSnapshotNote("");
                    setShowSaveModal(true);
                  }}
                  disabled={savingSnapshot}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Save this version with an optional note describing what changed"
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
            {/* CHARTS BUTTON — opens chart generator panel */}
            <button
              onClick={handleGenerateChart}
              disabled={generatingChart}
              className="group flex items-center gap-2 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-purple-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:from-amber-500/25 hover:to-purple-500/15 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Auto-generate a chart from your data with AI"
            >
              {generatingChart ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <span>📊</span>
                  <span>Charts</span>
                </>
              )}
            </button>

            {/* CHAT WITH SPREADSHEET BUTTON — opens chat panel */}
            <button
              onClick={() => setShowChat(true)}
              className="group flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-purple-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:from-cyan-500/25 hover:to-purple-500/15 hover:text-cyan-100"
              title="Ask AI questions about your spreadsheet in plain English"
            >
              <span>💬</span>
              <span>Chat</span>
            </button>

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

            {/* EXPORT BUTTON — download as .xlsx */}
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Download the current spreadsheet as an Excel file"
            >
              {exporting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Export</span>
                </>
              )}
            </button>

            {/* HISTORY BUTTON — opens the time travel panel */}
            {/* Red dot appears when someone else saved while panel was closed */}
            <button
              onClick={() => {
                setShowHistory((open) => !open);
                // Clear the "unseen" indicator the moment they check
                setHasUnseenSnapshots(false);
              }}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
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
              {/* RED DOT — unread snapshot from another user (Phase 4) */}
              {hasUnseenSnapshots && !showHistory && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border border-slate-900 bg-red-500" />
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
            <div className="flex flex-wrap items-center gap-3 text-purple-200">
              <span className="text-lg">🕐</span>
              <span className="font-semibold">
                Time travel — {formatTimestamp(viewingSnapshot.saved_at)}
              </span>
              <span className="text-xs text-purple-400">by {viewingSnapshot.author || "Anonymous"}</span>

              {/* Diff indicator — shows what's changed since this snapshot */}
              {diffCells.size > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                  {diffCells.size} cell{diffCells.size !== 1 ? "s" : ""} changed since
                </span>
              )}
              {structureChanged && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-200">
                  ⚠️ Structure differs (rows/columns)
                </span>
              )}
              {diffCells.size === 0 && !structureChanged && (
                <span className="text-xs text-purple-400">
                  ✓ No changes since this version
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* AI Compare button — only useful when there are changes to compare */}
              {(diffCells.size > 0 || structureChanged) && (
                <button
                  onClick={handleAICompare}
                  disabled={comparing}
                  className="flex items-center gap-2 rounded-lg border border-purple-500/40 bg-gradient-to-r from-purple-500/20 to-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition-colors hover:from-purple-500/30 hover:to-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Ask AI to explain what changed between this snapshot and the current version"
                >
                  {comparing ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
                      <span>Comparing...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>AI Compare</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={returnToCurrent}
                className="rounded-lg bg-purple-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-purple-400"
              >
                ← Return to Current
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-8 py-8">

        {/* SHEET TABS — only show if there's more than one sheet */}
        {availableSheets.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1.5">
            <span className="px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Sheets:
            </span>
            {availableSheets.map((sheet, idx) => {
              const isActive = idx === activeSheetIndex;
              const hasEdits = sheetEditsCache[sheet.name] !== undefined || (isActive && modifiedCells.size > 0);
              return (
                <button
                  key={sheet.name}
                  onClick={() => switchToSheet(idx)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                  }`}
                  title={`${sheet.name} — ${sheet.row_count} rows, ${sheet.column_count} columns`}
                >
                  <span>📑</span>
                  <span>{sheet.name}</span>
                  {hasEdits && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" title="Has unsaved edits" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* COMPACT FILE INFO STRIP — single-row layout */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5">
          {/* Left: filename + sheet name in a compact form */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-lg">📄</span>
            <span className="font-semibold text-slate-100">{data.filename}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{activeSheet.name}</span>
          </div>

          {/* Right: stats as small inline pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <CompactStat label="Rows" value={data.row_count} />
            <CompactStat label="Cols" value={data.column_count} />
            <CompactStat label="Edits" value={changeCount} highlight={changeCount > 0} />
            <CompactStat label="Snapshots" value={savedCount} highlight={savedCount > 0} />
          </div>
        </div>

        {/* EXCEL-STYLE GROUPED TOOLBAR — Wave 1 (sectioned ribbon style) */}
        {!isReadOnly && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/80 p-2.5 shadow-lg">
            <div className="flex flex-wrap items-stretch gap-2">

              {/* ========== HISTORY GROUP ========== */}
              <ToolbarGroup label="History" accent="slate">
                <ToolbarButton
                  onClick={performUndo}
                  icon="↶"
                  label="Undo"
                  disabled={undoStack.length === 0}
                  title={undoStack.length > 0 ? `Undo (Ctrl+Z) — ${undoStack.length} action${undoStack.length > 1 ? "s" : ""}` : "Nothing to undo"}
                />
                <ToolbarButton
                  onClick={performRedo}
                  icon="↷"
                  label="Redo"
                  disabled={redoStack.length === 0}
                  title={redoStack.length > 0 ? `Redo (Ctrl+Y) — ${redoStack.length} action${redoStack.length > 1 ? "s" : ""}` : "Nothing to redo"}
                />
              </ToolbarGroup>

              {/* ========== ROWS GROUP ========== */}
              <ToolbarGroup label="Rows" accent="emerald">
                <ToolbarButton onClick={addRowAtEnd} icon="➕" label="Add" title="Add a new empty row at the bottom" />
                <ToolbarButton
                  onClick={() => lastActive && insertRowAtPosition(lastActive.row)}
                  icon="⬆️"
                  label="Above"
                  disabled={!lastActive}
                  title={lastActive ? `Insert row above row ${lastActive.row + 1}` : "Click a cell first"}
                />
                <ToolbarButton
                  onClick={() => lastActive && insertRowAtPosition(lastActive.row + 1)}
                  icon="⬇️"
                  label="Below"
                  disabled={!lastActive}
                  title={lastActive ? `Insert row below row ${lastActive.row + 1}` : "Click a cell first"}
                />
                <ToolbarButton
                  onClick={() => lastActive && deleteRowAtPosition(lastActive.row)}
                  icon="❌"
                  label="Delete"
                  disabled={!lastActive}
                  danger
                  title={lastActive ? `Delete row ${lastActive.row + 1}` : "Click a cell first"}
                />
              </ToolbarGroup>

              {/* ========== COLUMNS GROUP ========== */}
              <ToolbarGroup label="Columns" accent="cyan">
                <ToolbarButton onClick={addColumnAtEnd} icon="➕" label="Add" title="Add a new empty column at the right" />
                <ToolbarButton
                  onClick={() => lastActive && insertColumnAtPosition(lastActive.col)}
                  icon="⬅️"
                  label="Left"
                  disabled={!lastActive}
                  title={lastActive ? `Insert column left of ${columnLetter(lastActive.col)}` : "Click a cell first"}
                />
                <ToolbarButton
                  onClick={() => lastActive && insertColumnAtPosition(lastActive.col + 1)}
                  icon="➡️"
                  label="Right"
                  disabled={!lastActive}
                  title={lastActive ? `Insert column right of ${columnLetter(lastActive.col)}` : "Click a cell first"}
                />
                <ToolbarButton
                  onClick={() => lastActive && deleteColumnAtPosition(lastActive.col)}
                  icon="❌"
                  label="Delete"
                  disabled={!lastActive}
                  danger
                  title={lastActive ? `Delete column ${columnLetter(lastActive.col)}` : "Click a cell first"}
                />
              </ToolbarGroup>

              {/* ========== FIND GROUP ========== */}
              <ToolbarGroup label="Find" accent="amber">
                <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5">
                  <span className="text-slate-500">🔎</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search..."
                    className="w-32 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-xs text-slate-500 hover:text-slate-300" title="Clear search">✕</button>
                  )}
                </div>
                <ToolbarButton onClick={smartCleanup} icon="🧹" label="Cleanup" title="Remove ALL empty rows (Ctrl+Z to undo)" />
              </ToolbarGroup>

              {/* ========== VIEW GROUP ========== */}
              <ToolbarGroup label="View" accent="purple">
                <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
                  <span className="text-xs text-slate-500">📅</span>
                  <select
                    value={dateFormat}
                    onChange={(event) => handleDateFormatChange(event.target.value as DateFormat)}
                    className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                    title="Date format"
                  >
                    <option value="dmy">DD/MM/YYYY</option>
                    <option value="mdy">MM/DD/YYYY</option>
                    <option value="iso">ISO</option>
                    <option value="short">Short</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
                  <span className="text-xs text-slate-500">🔒</span>
                  <select
                    value={frozenRows}
                    onChange={(event) => handleFreezeRowsChange(parseInt(event.target.value))}
                    className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                    title="Freeze top rows"
                  >
                    <option value={0}>No freeze</option>
                    <option value={1}>1 row</option>
                    <option value={2}>2 rows</option>
                    <option value={3}>3 rows</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
                  <span className="text-xs text-slate-500">📌</span>
                  <select
                    value={frozenColumns}
                    onChange={(event) => handleFreezeColumnsChange(parseInt(event.target.value))}
                    className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                    title="Freeze first columns"
                  >
                    <option value={0}>No freeze</option>
                    <option value={1}>1 col</option>
                    <option value={2}>2 cols</option>
                    <option value={3}>3 cols</option>
                  </select>
                </div>
                <ToolbarButton
                  onClick={() => setShowStats((open) => !open)}
                  icon="📊"
                  label={showStats ? "Hide" : "Stats"}
                  title="Toggle the statistics panel"
                />
              </ToolbarGroup>

              {/* ----- ACTIVE POSITION INDICATOR ----- */}
              {lastActive && (
                <div className="ml-auto self-center">
                  <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                    📍 {columnLetter(lastActive.col)}{lastActive.row + 1}
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* MULTI-ROW SELECTION ACTION BAR — appears when rows are selected */}
        {selectedRows.size > 0 && !isReadOnly && (
          <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 shadow-lg">
            {/* Top row: selection count + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-lg">✅</span>
                <span className="text-sm font-semibold text-emerald-200">
                  {selectedRows.size} row{selectedRows.size > 1 ? "s" : ""} selected
                </span>
                <span className="text-xs text-emerald-400">
                  Press Escape to clear · Delete key to remove
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllRows}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                  title="Select all rows"
                >
                  Select All
                </button>
                <button
                  onClick={deleteSelectedRows}
                  className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25"
                  title="Delete all selected rows"
                >
                  🗑️ Delete {selectedRows.size} row{selectedRows.size > 1 ? "s" : ""}
                </button>
                <button
                  onClick={clearRowSelection}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  title="Clear selection (Escape)"
                >
                  ✕ Clear
                </button>
              </div>
            </div>

            {/* Bottom row: live stats (like Excel's status bar at the bottom) */}
            {selectionStats && selectionStats.numericCount > 0 && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">📊</span>
                  <span className="text-slate-400">Sum:</span>
                  <span className="font-bold text-emerald-200">
                    {selectionStats.sum.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Average:</span>
                  <span className="font-bold text-emerald-200">
                    {selectionStats.average.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Count:</span>
                  <span className="font-bold text-emerald-200">{selectionStats.cells}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Numbers:</span>
                  <span className="font-bold text-emerald-200">{selectionStats.numericCount}</span>
                </div>
                <div className="ml-auto text-slate-500">
                  Just like Excel&apos;s status bar 📈
                </div>
              </div>
            )}
          </div>
        )}

        {/* THE EDITABLE SPREADSHEET TABLE — sticky-friendly scroll container */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="max-h-[70vh] overflow-auto rounded-xl">
            <table className="min-w-full text-sm">

              {/* Column letter headers (like Excel: A, B, C, D ...) — click to sort, always sticky */}
              <thead className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-40 w-12 bg-slate-900/95 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                    #
                  </th>
                  {Array.from({ length: columnCount }, (_, colIndex) => {
                    const isSorted = sortColumn === colIndex;
                    const arrow = isSorted ? (sortDirection === "asc" ? " ▲" : " ▼") : "";
                    const tooltip = isReadOnly
                      ? ""
                      : isSorted && sortDirection === "asc"
                        ? `Click again for descending ▼ on column ${columnLetter(colIndex)}`
                        : isSorted && sortDirection === "desc"
                          ? `Click again to restore original order (unsort)`
                          : `Click to sort by column ${columnLetter(colIndex)} ascending ▲`;
                    // Sticky positioning for frozen column letters
                    const isFrozenColHeader = colIndex < frozenColumns;
                    const colHeaderLeft = 48 + colIndex * 120;
                    const colHeaderStyle = isFrozenColHeader
                      ? { position: "sticky" as const, left: `${colHeaderLeft}px`, zIndex: 35 }
                      : undefined;
                    return (
                      <th
                        key={colIndex}
                        onClick={() => !isReadOnly && sortByColumn(colIndex)}
                        style={colHeaderStyle}
                        className={`min-w-[120px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors ${isFrozenColHeader ? "bg-slate-900/95" : ""} ${
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
                {displayedData.map((row, rowIndex) => {
                  // Determine if this row should freeze (stick to top while scrolling)
                  const isFrozenRow = rowIndex < frozenRows;
                  // Approximate row height (matches our py-3 padding + line height)
                  const FROZEN_ROW_HEIGHT = 49;
                  const HEADER_HEIGHT = 45; // height of the column letter thead
                  const rowStickyTop = HEADER_HEIGHT + rowIndex * FROZEN_ROW_HEIGHT;

                  // Style for sticking the entire row (applied per cell for reliability)
                  const rowStickyStyle: React.CSSProperties | undefined = isFrozenRow
                    ? { position: "sticky", top: `${rowStickyTop}px`, zIndex: 20 }
                    : undefined;

                  const isRowSelected = selectedRows.has(rowIndex);

                  return (
                  <tr key={rowIndex} className={`group/row ${isRowSelected ? "bg-emerald-500/10" : ""}`}>

                    {/* Row number column — sticky LEFT always; click+drag for multi-row selection */}
                    <td
                      onMouseDown={(event) => handleRowNumberMouseDown(rowIndex, event)}
                      onMouseEnter={() => handleRowNumberMouseEnter(rowIndex)}
                      style={isFrozenRow ? { position: "sticky", left: 0, top: `${rowStickyTop}px`, zIndex: 30 } : undefined}
                      className={`${isFrozenRow ? "" : "sticky left-0 z-10"} w-12 ${
                        isRowSelected
                          ? "bg-emerald-500/30 text-emerald-200"
                          : "bg-slate-900 text-slate-500 group-hover/row:bg-slate-800/60"
                      } cursor-pointer select-none px-3 py-3 text-center text-xs font-bold transition-colors`}
                      title="Click & drag to select | Shift+Click for range | Ctrl+Click to toggle"
                    >
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
                      // Visual diff: in time-travel mode, this cell changed since the snapshot
                      const isDiffCell = isReadOnly && diffCells.has(cellKey);
                      const currentNow = currentValuesMap.get(cellKey);
                      const tooltip = isDiffCell && currentNow !== undefined
                        ? `Now: ${currentNow || "(empty)"}`
                        : undefined;

                      // Frozen column — stick to the left when scrolling right
                      const isFrozenCol = colIndex < frozenColumns;
                      const FROZEN_COL_WIDTH = 120;
                      const ROW_NUM_COL_WIDTH = 48;
                      const colStickyLeft = ROW_NUM_COL_WIDTH + colIndex * FROZEN_COL_WIDTH;

                      // Build cell sticky style: row-freeze, col-freeze, or both
                      let cellStickyStyle: React.CSSProperties | undefined;
                      if (isFrozenRow && isFrozenCol) {
                        cellStickyStyle = {
                          position: "sticky",
                          top: `${rowStickyTop}px`,
                          left: `${colStickyLeft}px`,
                          zIndex: 35,
                        };
                      } else if (isFrozenRow) {
                        cellStickyStyle = rowStickyStyle;
                      } else if (isFrozenCol) {
                        cellStickyStyle = {
                          position: "sticky",
                          left: `${colStickyLeft}px`,
                          zIndex: 15,
                        };
                      }

                      // Phase 5 — pulse highlight if this cell was just edited by another user
                      const isRemotelyEdited = remotelyEditedCells.has(cellKey);

                      return (
                        <td
                          key={colIndex}
                          title={tooltip}
                          onClick={() => !isReadOnly && !isEditing && startEditing(rowIndex, colIndex)}
                          style={cellStickyStyle}
                          className={`min-w-[120px] px-4 py-3 transition-colors ${(isFrozenRow || isFrozenCol) ? "bg-slate-900" : ""} ${
                            isRemotelyEdited
                              ? "bg-sky-500/30 text-white ring-2 ring-inset ring-sky-400 animate-pulse"
                              : isReadOnly
                              ? isDiffCell
                                ? "cursor-default bg-yellow-500/15 text-yellow-100 ring-1 ring-inset ring-yellow-500/50"
                                : "cursor-default text-purple-100/90"
                              : isSearchMatch
                                ? "cursor-text bg-yellow-500/20 text-yellow-100 ring-1 ring-inset ring-yellow-500/50"
                                : isModified
                                  ? "cursor-text bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-500/40"
                                  : isActiveCell
                                    ? "cursor-text bg-emerald-500/15 text-slate-100 ring-2 ring-inset ring-emerald-500/70"
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
                  );
                })}
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

        {/* HELP FOOTER — only shown in time-travel mode (other messages removed) */}
        {isReadOnly && (
          <p className="mt-6 text-center text-sm text-slate-500">
            You are time-traveling. Click &apos;Return to Current&apos; to go back to editing mode.
          </p>
        )}

      </main>

      {/* CHARTS PANEL — Wave 3 Feature 2 */}
      {showCharts && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => !generatingChart && setShowCharts(false)}
          />

          <aside className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-amber-500/10 to-purple-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">AI Chart Generator</h2>
                  <p className="text-xs text-slate-400">
                    {chartSuggestion ? chartSuggestion.title : "AI is picking the best chart..."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !generatingChart && setShowCharts(false)}
                disabled={generatingChart}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {generatingChart ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="relative">
                    <span className="block h-16 w-16 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-400" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">📊</span>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-200">
                      AI is picking the perfect chart...
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Analyzing your columns and choosing the best visualization.
                    </p>
                  </div>
                </div>
              ) : chartSuggestion ? (
                <div className="space-y-5">

                  {/* Chart type switcher */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Chart type:
                    </span>
                    {(["bar", "line", "area", "pie"] as ChartType[]).map((type) => {
                      const isActive = (chartTypeOverride ?? chartSuggestion.chart_type) === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setChartTypeOverride(type)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/40"
                          }`}
                        >
                          {type === "bar" && "📊 Bar"}
                          {type === "line" && "📈 Line"}
                          {type === "area" && "🏔️ Area"}
                          {type === "pie" && "🥧 Pie"}
                        </button>
                      );
                    })}
                  </div>

                  {/* AI reasoning */}
                  {chartSuggestion.reasoning && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm text-purple-200">
                      <span className="font-semibold">🤖 AI says: </span>
                      {chartSuggestion.reasoning}
                    </div>
                  )}

                  {/* The chart itself */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <ChartRenderer
                      data={viewingSnapshotData ?? editedData}
                      suggestion={chartSuggestion}
                      typeOverride={chartTypeOverride}
                    />
                  </div>

                  {/* Re-generate button */}
                  <div className="text-center">
                    <button
                      onClick={handleGenerateChart}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
                    >
                      ✨ Suggest different chart
                    </button>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  No chart yet.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-3 text-center text-xs text-slate-500">
              Powered by AI + Recharts. Charts use your current data view.
            </div>

          </aside>
        </>
      )}

      {/* CHAT WITH SPREADSHEET PANEL — Wave 3 */}
      {showChat && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => !chatThinking && setShowChat(false)}
          />

          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Chat with Spreadsheet</h2>
                  <p className="text-xs text-slate-400">
                    Ask anything about your data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-300"
                    title="Clear the conversation"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => !chatThinking && setShowChat(false)}
                  disabled={chatThinking}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {chatMessages.length === 0 ? (
                <div className="mt-8 space-y-4">
                  <div className="text-center">
                    <div className="mb-2 text-4xl">🤖</div>
                    <p className="text-sm font-semibold text-slate-200">
                      Ask me anything about your spreadsheet!
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      I have read all {(viewingSnapshotData ?? editedData).length} rows.
                    </p>
                  </div>

                  {/* Example questions */}
                  <div className="space-y-2">
                    <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Try asking:
                    </p>
                    {[
                      "What was my best sales day?",
                      "How many days had zero sales?",
                      "What is the total sales for the month?",
                      "Which row has the highest value?",
                      "Are there any unusual patterns?",
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setChatInput(suggestion)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-200"
                      >
                        &ldquo;{suggestion}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-cyan-500 text-slate-950"
                            : "border border-slate-800 bg-slate-900 text-slate-200"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatThinking && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:0.2s]" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-2">

                {/* MIC BUTTON — Voice query (Web Speech API) */}
                {voiceSupported && (
                  <button
                    onClick={isListening ? stopVoiceQuery : startVoiceQuery}
                    disabled={chatThinking}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isListening
                        ? "animate-pulse bg-red-500 text-white"
                        : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                    }`}
                    title={isListening ? "Stop listening" : "Speak your question"}
                  >
                    {isListening ? "🔴" : "🎤"}
                  </button>
                )}

                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !chatThinking) {
                      handleSendChatMessage();
                    }
                  }}
                  placeholder={isListening ? "Listening... speak now!" : "Ask anything..."}
                  disabled={chatThinking || isListening}
                  className={`flex-1 rounded-full border bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    isListening
                      ? "border-red-500/50 placeholder:text-red-300 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-slate-700 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                  }`}
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={chatThinking || !chatInput.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send (Enter)"
                >
                  {chatThinking ? "⏳" : "→"}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                {voiceSupported
                  ? isListening
                    ? "🎙️ Listening... speak clearly"
                    : "Click 🎤 to speak, or type a question. Press Enter to send."
                  : "Press Enter to send. (Voice not supported in this browser)"}
              </p>
            </div>

          </aside>
        </>
      )}

      {/* AI COMPARE MODAL — shows the AI-generated story of what changed */}
      {showCompareModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => !comparing && setShowCompareModal(false)}
          />

          <aside className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-purple-500/15 to-emerald-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">AI Compare</h2>
                  <p className="text-xs text-slate-400">
                    {compareResult
                      ? `${compareResult.total_changes} change${compareResult.total_changes !== 1 ? "s" : ""} between versions`
                      : "Asking AI to compare the two versions..."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !comparing && setShowCompareModal(false)}
                disabled={comparing}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {comparing ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="relative">
                    <span className="block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-400" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">✨</span>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-purple-200">
                      AI is comparing the two versions...
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Reading every changed cell and writing the story.
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Usually takes 3 to 8 seconds.
                    </p>
                  </div>
                </div>
              ) : compareResult ? (
                <div className="space-y-5">

                  {/* Compare context */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-purple-400">🕐</span>
                      <span className="font-medium">{compareResult.past_label}</span>
                    </div>
                    <div className="my-1 ml-3 border-l-2 border-slate-700 pl-3 text-slate-600">
                      vs
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-emerald-400">📍</span>
                      <span className="font-medium">{compareResult.current_label}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  {compareResult.analysis.summary && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                        📋 Summary
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-200">
                        {compareResult.analysis.summary}
                      </p>
                    </div>
                  )}

                  {/* Key Changes */}
                  {compareResult.analysis.key_changes && compareResult.analysis.key_changes.length > 0 && (
                    <InsightSection
                      icon="🎯"
                      title="Key Changes"
                      color="purple"
                      items={compareResult.analysis.key_changes}
                    />
                  )}

                  {/* Patterns */}
                  {compareResult.analysis.patterns && compareResult.analysis.patterns.length > 0 && (
                    <InsightSection
                      icon="🔍"
                      title="Patterns"
                      color="cyan"
                      items={compareResult.analysis.patterns}
                    />
                  )}

                  {/* Impact */}
                  {compareResult.analysis.impact && compareResult.analysis.impact.length > 0 && (
                    <InsightSection
                      icon="💥"
                      title="Likely Impact"
                      color="amber"
                      items={compareResult.analysis.impact}
                    />
                  )}

                  {/* Raw diff sample */}
                  {compareResult.diffs_sample && compareResult.diffs_sample.length > 0 && (
                    <details className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-400">
                        🔬 View raw diffs ({compareResult.diffs_sample.length} cell{compareResult.diffs_sample.length !== 1 ? "s" : ""})
                      </summary>
                      <ul className="mt-3 space-y-1 text-xs font-mono">
                        {compareResult.diffs_sample.map((diff, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-300">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-purple-300">
                              {diff.cell}
                            </span>
                            <span className="text-slate-500 line-through">{diff.past || "(empty)"}</span>
                            <span className="text-slate-500">→</span>
                            <span className="font-semibold text-emerald-300">{diff.current || "(empty)"}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  No comparison yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-3 text-center text-xs text-slate-500">
              AI can make mistakes. Verify important findings yourself.
            </div>

          </aside>
        </>
      )}

      {/* SAVE SNAPSHOT MODAL — opens when user clicks "Save Snapshot" */}
      {showSaveModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => !savingSnapshot && setShowSaveModal(false)}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-500/30 bg-slate-950 shadow-2xl">

            {/* Modal header */}
            <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💾</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Save Snapshot</h2>
                  <p className="text-xs text-slate-400">
                    Capture this version forever in your time machine
                  </p>
                </div>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">

              {/* Stats line */}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
                  {changeCount} change{changeCount !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-500">
                  {editedData.length} rows · {editedData[0]?.length ?? 0} columns
                </span>
              </div>

              {/* Note input */}
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Add a note (optional)
              </label>
              <input
                type="text"
                value={snapshotNote}
                onChange={(event) => setSnapshotNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !savingSnapshot) {
                    setShowSaveModal(false);
                    handleSaveSnapshot(snapshotNote);
                  }
                  if (event.key === "Escape") {
                    setShowSaveModal(false);
                  }
                }}
                placeholder='e.g., "Updated Q1 totals" or "Fixed Vendor X amount"'
                autoFocus
                maxLength={200}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="mt-2 text-xs text-slate-500">
                A short note helps future you understand what changed. Leave blank to skip.
              </p>

            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900/50 px-6 py-3">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={savingSnapshot}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  handleSaveSnapshot(snapshotNote);
                }}
                disabled={savingSnapshot}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingSnapshot ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Snapshot</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </>
      )}

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

                      const justCopied = copiedSnapshotId === snapshot.id;

                      return (
                        <div
                          key={snapshot.id}
                          className={`group w-full rounded-lg border p-3 transition-colors ${
                            loadingSnapshot ? "opacity-50" : ""
                          } ${
                            isViewing
                              ? "border-purple-500/50 bg-purple-500/10"
                              : "border-slate-800 bg-slate-900 hover:border-purple-500/30 hover:bg-slate-800"
                          }`}
                        >
                          {/* Top row: title + Share button */}
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (loadingSnapshot) return;
                                travelToSnapshot(snapshot.id);
                                setShowHistory(false);
                              }}
                              disabled={loadingSnapshot}
                              className="flex-1 text-left disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${isViewing ? "text-purple-300" : "text-slate-200"}`}>
                                  🕐 Snapshot #{snapshotNumber}
                                </span>
                                {isViewing && (
                                  <span className="text-xs font-medium text-purple-400">Viewing</span>
                                )}
                              </div>
                            </button>
                            {/* Share link button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const shareUrl = `${window.location.origin}/share?id=${snapshot.id}`;
                                navigator.clipboard
                                  .writeText(shareUrl)
                                  .then(() => {
                                    setCopiedSnapshotId(snapshot.id);
                                    setTimeout(() => setCopiedSnapshotId(null), 2000);
                                  })
                                  .catch(() => {
                                    alert(`Copy this link to share:\n${shareUrl}`);
                                  });
                              }}
                              title="Copy share link"
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition ${
                                justCopied
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700"
                              }`}
                            >
                              {justCopied ? "✓ Copied" : "🔗 Share"}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (loadingSnapshot) return;
                              travelToSnapshot(snapshot.id);
                              setShowHistory(false);
                            }}
                            disabled={loadingSnapshot}
                            className="mt-1 block w-full text-left disabled:cursor-not-allowed"
                          >
                            <p className="text-xs text-slate-400">
                              <span className="font-semibold text-emerald-400/80">
                                By {snapshot.author || "Anonymous"}
                              </span>
                              <span className="mx-1.5 text-slate-600">·</span>
                              {formatTimestamp(snapshot.saved_at)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {snapshot.changes_from_previous} change{snapshot.changes_from_previous !== 1 ? "s" : ""} from previous
                            </p>
                            {/* Show user's note if provided */}
                            {snapshot.note && (
                              <p className="mt-2 rounded border border-slate-700/50 bg-slate-950/50 px-2 py-1 text-xs italic text-slate-300">
                                📝 {snapshot.note}
                              </p>
                            )}
                          </button>
                        </div>
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
// CHART RENDERER — Visualizes spreadsheet data with Recharts
// ============================================
type ChartRendererSuggestion = {
  chart_type: "bar" | "line" | "pie" | "area";
  title: string;
  x_column: number;
  y_column: number;
  x_label: string;
  y_label: string;
  reasoning: string;
};

// Distinct emerald-purple-cyan palette for pie slices
const PIE_COLORS = [
  "#10b981", "#a855f7", "#06b6d4", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#84cc16", "#f97316", "#8b5cf6",
];

function ChartRenderer({
  data,
  suggestion,
  typeOverride,
}: {
  data: (string | number | boolean | null)[][];
  suggestion: ChartRendererSuggestion;
  typeOverride: "bar" | "line" | "pie" | "area" | null;
}) {
  // Effective chart type — override wins if user picked one
  const chartType = typeOverride ?? suggestion.chart_type;

  // Transform the spreadsheet data into Recharts format.
  // Skip first row if it looks like headers (non-numeric in y-column).
  const chartData = useMemo(() => {
    const rows: { name: string; value: number }[] = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const xValue = row[suggestion.x_column];
      const yValue = row[suggestion.y_column];

      // Try to parse y as a number — skip if not numeric
      const numericY = parseFloat(String(yValue ?? ""));
      if (isNaN(numericY)) continue;

      const xLabel = String(xValue ?? `Row ${i + 1}`).trim() || `Row ${i + 1}`;
      rows.push({ name: xLabel, value: numericY });
    }
    return rows;
  }, [data, suggestion.x_column, suggestion.y_column]);

  if (chartData.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No numeric data found in column {String.fromCharCode(65 + suggestion.y_column)}.
      </div>
    );
  }

  // Render based on chart type
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" angle={-35} textAnchor="end" interval={0} height={70} style={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
              cursor={{ fill: "#10b98115" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8" }} />
            <Bar dataKey="value" name={suggestion.y_label} fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" angle={-35} textAnchor="end" interval={0} height={70} style={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8" }} />
            <Line type="monotone" dataKey="value" name={suggestion.y_label} stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981" }} />
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" angle={-35} textAnchor="end" interval={0} height={70} style={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8" }} />
            <Area type="monotone" dataKey="value" name={suggestion.y_label} stroke="#10b981" strokeWidth={2} fill="url(#areaFill)" />
          </AreaChart>
        ) : (
          // PIE chart
          <PieChart>
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={130}
              label={(entry: { name: string; value: number }) => `${entry.name}: ${entry.value}`}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
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
// TOOLBAR GROUP — A labeled section with a subtle colored card background
// ============================================
type GroupAccent = "slate" | "emerald" | "cyan" | "amber" | "purple";

const GROUP_ACCENT_STYLES: Record<GroupAccent, { label: string; bg: string; border: string }> = {
  slate:   { label: "text-slate-400",   bg: "bg-slate-800/40",   border: "border-slate-700/40" },
  emerald: { label: "text-emerald-300", bg: "bg-emerald-500/5",  border: "border-emerald-500/20" },
  cyan:    { label: "text-cyan-300",    bg: "bg-cyan-500/5",     border: "border-cyan-500/20" },
  amber:   { label: "text-amber-300",   bg: "bg-amber-500/5",    border: "border-amber-500/20" },
  purple:  { label: "text-purple-300",  bg: "bg-purple-500/5",   border: "border-purple-500/20" },
};

function ToolbarGroup({
  label,
  accent = "slate",
  children,
}: {
  label: string;
  accent?: GroupAccent;
  children: React.ReactNode;
}) {
  const style = GROUP_ACCENT_STYLES[accent];
  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 pt-1.5 pb-2`}>
      {/* Section label — colored accent, small uppercase */}
      <span className={`text-[10px] font-bold uppercase tracking-widest ${style.label}`}>
        {label}
      </span>
      {/* The buttons in this group, tightly packed */}
      <div className="flex items-center gap-1">{children}</div>
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
// COMPACT STAT — Inline pill for the slim file info strip
// ============================================
function CompactStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
        highlight
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-slate-700 bg-slate-800/40 text-slate-300"
      }`}
    >
      <span className="text-slate-500">{label}:</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}

// ============================================
// STAT — Small metric card (file summary, larger version — still used in stats panel)
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

// ============================================
// BENTO GRID FEATURE COMPONENTS — Apple-style varying sizes
// ============================================
type FeatureAccent = "emerald" | "purple" | "amber" | "cyan" | "yellow" | "slate";

const FEATURE_ACCENT_STYLES: Record<FeatureAccent, { border: string; iconBg: string; iconText: string; glow: string; title: string }> = {
  emerald: { border: "border-emerald-500/20 hover:border-emerald-500/50", iconBg: "bg-emerald-500/20", iconText: "text-emerald-300", glow: "hover:shadow-emerald-500/10", title: "group-hover:text-emerald-300" },
  purple:  { border: "border-purple-500/20 hover:border-purple-500/50",   iconBg: "bg-purple-500/20",  iconText: "text-purple-300",  glow: "hover:shadow-purple-500/10",  title: "group-hover:text-purple-300" },
  amber:   { border: "border-amber-500/20 hover:border-amber-500/50",     iconBg: "bg-amber-500/20",   iconText: "text-amber-300",   glow: "hover:shadow-amber-500/10",   title: "group-hover:text-amber-300" },
  cyan:    { border: "border-cyan-500/20 hover:border-cyan-500/50",       iconBg: "bg-cyan-500/20",    iconText: "text-cyan-300",    glow: "hover:shadow-cyan-500/10",    title: "group-hover:text-cyan-300" },
  yellow:  { border: "border-yellow-500/20 hover:border-yellow-500/50",   iconBg: "bg-yellow-500/20",  iconText: "text-yellow-300",  glow: "hover:shadow-yellow-500/10",  title: "group-hover:text-yellow-300" },
  slate:   { border: "border-slate-700 hover:border-slate-500",           iconBg: "bg-slate-700/60",   iconText: "text-slate-300",   glow: "hover:shadow-slate-500/10",   title: "group-hover:text-slate-100" },
};

// FEATURED — Big 2x2 card with mini timeline visualization
function BentoFeatured({
  icon,
  title,
  description,
  accent = "emerald",
}: {
  icon: string;
  title: string;
  description: string;
  accent?: FeatureAccent;
}) {
  const style = FEATURE_ACCENT_STYLES[accent];
  return (
    <div className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border ${style.border} bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-7 transition-all hover:-translate-y-1 hover:shadow-2xl ${style.glow} sm:col-span-2 lg:col-span-2 lg:row-span-2`}>
      {/* Subtle glow in background */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-4">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${style.iconBg} text-4xl shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <h3 className={`text-2xl font-bold text-slate-100 transition-colors ${style.title}`}>
            {title}
          </h3>
          <p className="mt-2 text-base leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {/* Mini timeline visualization at the bottom */}
      <div className="relative mt-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/70">Timeline</span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${i === 5 ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 bg-emerald-400" : "bg-emerald-500/40"}`} />
              <span className="text-[9px] text-slate-600">v{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// WIDE — 2x1 card (good for medium-importance features)
function BentoWide({
  icon,
  title,
  description,
  accent = "purple",
}: {
  icon: string;
  title: string;
  description: string;
  accent?: FeatureAccent;
}) {
  const style = FEATURE_ACCENT_STYLES[accent];
  return (
    <div className={`group flex flex-col gap-3 rounded-2xl border ${style.border} bg-slate-900/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-xl ${style.glow} sm:col-span-2 lg:col-span-2`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.iconBg} text-2xl transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold text-slate-100 transition-colors ${style.title}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// SMALL — 1x1 compact card
function BentoSmall({
  icon,
  title,
  description,
  accent = "cyan",
}: {
  icon: string;
  title: string;
  description: string;
  accent?: FeatureAccent;
}) {
  const style = FEATURE_ACCENT_STYLES[accent];
  return (
    <div className={`group flex flex-col gap-2 rounded-2xl border ${style.border} bg-slate-900/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-xl ${style.glow}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg} text-xl transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className={`text-sm font-bold text-slate-100 transition-colors ${style.title}`}>
        {title}
      </h3>
      <p className="text-xs leading-snug text-slate-500">
        {description}
      </p>
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
