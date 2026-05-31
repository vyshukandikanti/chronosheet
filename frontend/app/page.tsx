// ChronoSheet — Welcome Page
// Split-screen layout: brand and message on the left, visual preview on the right.
// Custom SVG logo: a cell containing a rewinding arrow (cell + time travel).

export default function Home() {
  return (
    // OUTER WRAPPER — full screen, deep dark background with a subtle glow in the corner
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">

      {/* Subtle glowing orb in the background — gives the page a premium feel */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      {/* TOP NAVIGATION BAR — brand on the left, version on the right */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Brand />
        <span className="text-sm text-slate-400">v0.1 — Day Zero</span>
      </header>

      {/* MAIN CONTENT — split into two halves on big screens, stacked on small screens */}
      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">

        {/* LEFT HALF — message, description, action buttons */}
        <div className="flex flex-col justify-center">

          {/* Small label above the heading — adds tech credibility */}
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            Powered by Raft consensus and Artificial Intelligence
          </span>

          {/* Big heading — the tagline as the hero */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Time travel for your{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              spreadsheets.
            </span>
          </h1>

          {/* Description — tells the story in a friendly tone */}
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
            Every cell change captured. Every moment preserved. Every story told.
            ChronoSheet is the intelligent history layer your data has always deserved.
          </p>

          {/* Action buttons — primary and secondary */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">

            {/* Primary button — the main action (upload spreadsheet) */}
            <button className="group flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-500 px-6 font-semibold text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30">
              <span>Upload Spreadsheet</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>

            {/* Secondary button — for users who want to learn more first */}
            <button className="flex h-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 px-6 font-medium text-slate-200 backdrop-blur transition-colors hover:border-slate-500 hover:bg-slate-800/50">
              How It Works
            </button>

          </div>

          {/* Small stats line — gives a quick feel of capability */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="text-cyan-400">●</span> Free forever
            </span>
            <span className="flex items-center gap-2">
              <span className="text-cyan-400">●</span> No installation needed
            </span>
            <span className="flex items-center gap-2">
              <span className="text-cyan-400">●</span> Works in any browser
            </span>
          </div>

        </div>

        {/* RIGHT HALF — visual preview of a time-traveling spreadsheet */}
        <div className="flex items-center justify-center">
          <SpreadsheetPreview />
        </div>

      </main>

      {/* FOOTER LINE — the memorable one-liner */}
      <footer className="relative z-10 px-8 py-8 text-center text-sm text-slate-600">
        Excel forgets. ChronoSheet remembers.
      </footer>

    </div>
  );
}

// ============================================
// BRAND COMPONENT — Custom SVG logo + wordmark
// ============================================
function Brand() {
  return (
    <div className="flex items-center gap-2.5">

      {/* Custom logo — a cell with a rewinding arrow inside (drawn in SVG) */}
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="h-6 w-6 text-slate-950"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Curved arrow — represents rewind / time travel */}
          <path
            d="M 28 15 A 9 9 0 1 0 28 25"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arrowhead — points back, indicating "go back in time" */}
          <path
            d="M 28 11 L 28 15 L 32 15"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Wordmark — the project name in bold */}
      <span className="text-xl font-bold tracking-tight">
        Chrono<span className="text-cyan-400">Sheet</span>
      </span>

    </div>
  );
}

// ============================================
// SPREADSHEET PREVIEW — Visual mock on the right
// Shows a fake spreadsheet with a timeline slider underneath
// ============================================
function SpreadsheetPreview() {
  return (
    <div className="w-full max-w-md">

      {/* Browser-style window frame around the spreadsheet */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur">

        {/* Top bar — like a browser title bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs text-slate-500">
            sales_report.xlsx
          </span>
        </div>

        {/* The fake spreadsheet content */}
        <div className="p-5">

          {/* Tiny grid header row */}
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-slate-500">
            <div className="px-2 py-1.5">#</div>
            <div className="px-2 py-1.5">Item</div>
            <div className="px-2 py-1.5">Amount</div>
            <div className="px-2 py-1.5">Date</div>
          </div>

          {/* A few data rows */}
          <div className="mt-1 space-y-1">
            <Row num="1" item="Office Rent" amount="₹40,000" date="May 01" />
            <Row num="2" item="Supplies" amount="₹12,500" date="May 03" />
            {/* This row is the highlighted one — shows the changed value */}
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/40 text-sm">
              <div className="px-2 py-1.5 text-slate-300">3</div>
              <div className="px-2 py-1.5 text-slate-200">Vendor X</div>
              <div className="px-2 py-1.5">
                <span className="text-slate-500 line-through">₹50,000</span>{" "}
                <span className="font-semibold text-cyan-300">₹75,000</span>
              </div>
              <div className="px-2 py-1.5 text-slate-300">May 15</div>
            </div>
            <Row num="4" item="Marketing" amount="₹20,000" date="May 20" />
          </div>

          {/* Small AI explanation chip — like a callout */}
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
            <span className="font-semibold text-cyan-400">🤖 AI: </span>
            B3 changed from ₹50,000 to ₹75,000 on May 15 — likely linked to the new vendor entry added the same day.
          </div>

        </div>

        {/* Timeline slider section at the bottom */}
        <div className="border-t border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Timeline</span>
            <span className="font-medium text-cyan-300">May 15 · 11:00 AM</span>
          </div>

          {/* The slider track with the position indicator */}
          <div className="relative h-1.5 w-full rounded-full bg-slate-800">
            {/* Progress fill */}
            <div className="absolute left-0 top-0 h-1.5 w-3/4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
            {/* The draggable handle */}
            <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-cyan-400 shadow-lg shadow-cyan-500/50" style={{ left: "calc(75% - 8px)" }} />
          </div>

          {/* Dots along the timeline showing different snapshot points */}
          <div className="mt-3 flex justify-between text-[10px] text-slate-600">
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
function Row({ num, item, amount, date }: { num: string; item: string; amount: string; date: string }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-sm text-slate-400">
      <div className="px-2 py-1.5">{num}</div>
      <div className="px-2 py-1.5">{item}</div>
      <div className="px-2 py-1.5">{amount}</div>
      <div className="px-2 py-1.5">{date}</div>
    </div>
  );
}
