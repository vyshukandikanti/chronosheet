# ChronoSheet

> Time travel for your spreadsheets.

ChronoSheet is a free, web-based application that brings version control, intelligent change detection, and fault-tolerant collaboration to everyday spreadsheets.

## The Problem

Excel and Google Sheets are everywhere, but they suffer from:

- Lost data when files get corrupted or crash
- The chaos of multiple versions ("budget_final_v3.xlsx")
- Broken formulas with no way to know when they broke
- No real audit trail of what changed, when, or by whom
- No way to easily undo or compare changes

## The Solution

ChronoSheet reimagines the spreadsheet through distributed systems engineering:

- Every cell change becomes an entry in an append-only log (Raft consensus log)
- The current state is a Key-Value Store where each cell address maps to its latest value
- Users can drag a timeline slider to see the spreadsheet at any past moment
- An Artificial Intelligence assistant explains what changed and why
- Anomaly detection automatically flags suspicious entries and broken formulas
- Multi-user collaboration is safe thanks to the Raft consensus algorithm

## Key Features

- Time-travel viewer with a draggable timeline slider
- Cell-level history with full change story
- Artificial Intelligence powered change explanations (using Google Gemini)
- Anomaly detection for spreadsheet auditing
- Real-time multi-user collaboration with crash safety
- Free and web-based, runs in any browser

## Tech Stack

- Frontend: Next.js with Tailwind CSS
- Backend: Python with FastAPI
- Database: Supabase
- Artificial Intelligence: Google Gemini
- Distributed Storage: pysyncobj (Raft consensus library)
- Hosting: Vercel (frontend), Render (backend)

## Status

Day Zero. Project just created. Active development.

## Built By

Vyshnavi
