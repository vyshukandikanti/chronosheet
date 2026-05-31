// ChronoSheet — Welcome Page (V2: Emerald + Navy SaaS)
// ----------------------------------------------------
// Theme: Flat Minimal SaaS
// Logo: Minimal circular timeline icon with subtle spreadsheet grid inside
// Wordmark: Bold "ChronoSheet"
// Primary color: Emerald Green | Secondary: Dark Navy | Accent: Purple
// Tagline: "Spreadsheets That Remember."
// Sub-tagline: "Every Change. Every Reason. Every Time."
// Font: Sora (set globally via layout.tsx)

export default function Home() {
  return (
    // OUTER WRAPPER — fills the entire screen with a deep navy background
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">

      {/* Soft emerald and purple glow behind the page — flat, very subtle */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

      {/* TOP NAVIGATION — brand on the left, version label on the right */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Brand />
        <span className="text-sm font-medium text-slate-500">v0.1 — Day Zero</span>
      </header>

      {/* MAIN CONTENT — split into two halves on big screens */}
      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">

        {/* LEFT HALF — message, description, action buttons */}
        <div className="flex flex-col justify-center">

          {/* Small credibility badge above the heading */}
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Powered by Raft consensus and Artificial Intelligence
          </span>

          {/* HERO HEADING — the main tagline */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Spreadsheets That{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              Remember.
            </span>
          </h1>

          {/* SUB-HEADING — the supporting tagline */}
          <p className="mt-5 text-xl font-medium text-slate-300">
            Every Change. Every Reason. Every Time.
          </p>

          {/* Description paragraph */}
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">
            ChronoSheet is the intelligent history layer your data has always deserved.
            Track every cell change, understand why it happened, and travel through time
            with confidence.
          </p>

          {/* ACTION BUTTONS — primary emerald + secondary outline */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">

            {/* Primary action — the main button */}
            <button className="group flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 font-semibold text-slate-950 transition-colors hover:bg-emerald-400">
              <span>Upload Spreadsheet</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>

            {/* Secondary action — for learners */}
            <button className="flex h-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-6 font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800">
              How It Works
            </button>

          </div>

          {/* Small stats line — quick capability signals */}
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

        {/* RIGHT HALF — visual preview of a time-traveling spreadsheet */}
        <div className="flex items-center justify-center">
          <SpreadsheetPreview />
        </div>

      </main>

      {/* FOOTER LINE */}
      <footer className="relative z-10 px-8 py-8 text-center text-sm text-slate-600">
        Excel forgets. ChronoSheet remembers.
      </footer>

    </div>
  );
}

// ============================================
// BRAND — Custom circular timeline logo + Bold wordmark
// ============================================
function Brand() {
  return (
    <div className="flex items-center gap-3">

      {/* Logo container — flat emerald square (no gradient, true flat SaaS feel) */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">

        {/* Custom SVG — circular timeline with subtle spreadsheet grid inside */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="h-7 w-7 text-slate-950"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle — the timeline track */}
          <circle
            cx="20"
            cy="20"
            r="15"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />

          {/* Subtle spreadsheet grid inside — represents the cells being tracked */}
          <g opacity="0.55" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            {/* Vertical grid lines */}
            <line x1="14" y1="14" x2="14" y2="26" />
            <line x1="20" y1="14" x2="20" y2="26" />
            <line x1="26" y1="14" x2="26" y2="26" />
            {/* Horizontal grid lines */}
            <line x1="14" y1="14" x2="26" y2="14" />
            <line x1="14" y1="20" x2="26" y2="20" />
            <line x1="14" y1="26" x2="26" y2="26" />
          </g>

          {/* Position indicator dot — the "current time" point on the timeline */}
          <circle cx="20" cy="5" r="2.8" fill="currentColor" />
        </svg>

      </div>

      {/* Bold wordmark — "Chrono" white + "Sheet" emerald */}
      <span className="text-xl font-bold tracking-tight">
        Chrono<span className="text-emerald-400">Sheet</span>
      </span>

    </div>
  );
}

// ============================================
// SPREADSHEET PREVIEW — Right-side visual mock
// ============================================
function SpreadsheetPreview() {
  return (
    <div className="w-full max-w-md">

      {/* Window frame — clean and flat, no heavy shadows */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        {/* Top window bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs font-medium text-slate-500">
            sales_report.xlsx
          </span>
        </div>

        {/* Spreadsheet content area */}
        <div className="p-5">

          {/* Header row */}
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-slate-500">
            <div className="px-2 py-1.5">#</div>
            <div className="px-2 py-1.5">Item</div>
            <div className="px-2 py-1.5">Amount</div>
            <div className="px-2 py-1.5">Date</div>
          </div>

          {/* Data rows */}
          <div className="mt-1 space-y-1">
            <Row num="1" item="Office Rent" amount="₹40,000" date="May 01" />
            <Row num="2" item="Supplies" amount="₹12,500" date="May 03" />

            {/* The highlighted row — shows a value that changed */}
            <div className="grid grid-cols-4 gap-1 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/40 text-sm">
              <div className="px-2 py-1.5 text-slate-300">3</div>
              <div className="px-2 py-1.5 text-slate-200">Vendor X</div>
              <div className="px-2 py-1.5">
                <span className="text-slate-500 line-through">₹50,000</span>{" "}
                <span className="font-semibold text-emerald-300">₹75,000</span>
              </div>
              <div className="px-2 py-1.5 text-slate-300">May 15</div>
            </div>

            <Row num="4" item="Marketing" amount="₹20,000" date="May 20" />
          </div>

          {/* AI explanation chip */}
          <div className="mt-4 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-400">
            <span className="font-semibold text-purple-400">AI Insight: </span>
            B3 changed from ₹50,000 to ₹75,000 on May 15 — likely linked to the new
            vendor entry added the same day.
          </div>

        </div>

        {/* Timeline slider — emerald to purple gradient */}
        <div className="border-t border-slate-800 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Timeline</span>
            <span className="font-semibold text-emerald-300">May 15 · 11:00 AM</span>
          </div>

          {/* Slider track */}
          <div className="relative h-1.5 w-full rounded-full bg-slate-800">
            {/* Progress fill — emerald to purple gradient */}
            <div className="absolute left-0 top-0 h-1.5 w-3/4 rounded-full bg-gradient-to-r from-emerald-500 to-purple-500" />
            {/* Slider handle */}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-emerald-400"
              style={{ left: "calc(75% - 8px)" }}
            />
          </div>

          {/* Timeline markers */}
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
// ROW HELPER — A single row in the fake spreadsheet
// ============================================
function Row({
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
