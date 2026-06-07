"""
ChronoSheet Backend — main.py
==============================
The brain of ChronoSheet.

What lives here:
- Welcome / health / version endpoints
- Upload spreadsheet endpoint (Phase 1)
- Snapshot save / list / get endpoints (Phase 2 — Time Machine)
- AI analysis endpoint powered by Groq (Phase 3 — Insights)

Architecture note:
- Snapshots are stored in memory as an append-only log (Raft-style).
- AI analysis uses Groq's Llama 3.3 70B model — free and very fast.
"""

import json
import os
from datetime import date, datetime, time
from io import BytesIO
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq
from openpyxl import Workbook, load_workbook
from pydantic import BaseModel
from supabase import Client, create_client

# ============================================
# Load environment variables from .env file
# ============================================
# This reads backend/.env and makes the keys available as environment variables.
# .env is protected by .gitignore — it never goes to GitHub.
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize Groq client only if the key was found
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ============================================
# Supabase setup — optional persistent storage
# ============================================
# If SUPABASE_URL and SUPABASE_KEY are set, snapshots are saved to the cloud
# and survive backend restarts. Otherwise, falls back to in-memory storage.
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_TABLE = "snapshots"

supabase_client: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[Supabase] Connected — snapshots will persist to cloud database.")
    except Exception as error:
        print(f"[Supabase] Failed to connect: {error}. Falling back to in-memory storage.")
        supabase_client = None
else:
    print("[Supabase] Not configured — using in-memory storage only.")


# ============================================
# Create the FastAPI application
# ============================================
app = FastAPI(
    title="ChronoSheet API",
    description="The intelligent history layer for spreadsheets.",
    version="0.3.0",
)

# ============================================
# CORS — let the frontend talk to the backend
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:3000",
        "http://192.168.0.106:3000",
        # Production frontend on Netlify
        "https://chronosheet.netlify.app",
    ],
    # Also allow Netlify preview deploys
    # (URLs like deploy-preview-X--chronosheet.netlify.app)
    allow_origin_regex=r"https://.*--chronosheet\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Expose Content-Disposition so frontend can read the export filename
    expose_headers=["Content-Disposition"],
)


# ============================================
# In-memory snapshot storage (the "Raft log")
# ============================================
snapshots_log: list[dict[str, Any]] = []


# ============================================
# Welcome endpoint
# ============================================
@app.get("/")
def welcome():
    return {
        "name": "ChronoSheet API",
        "version": "0.3.0",
        "status": "alive",
        "message": "Welcome to ChronoSheet — Spreadsheets That Remember.",
        "docs": "Visit /docs to see all available endpoints.",
        "snapshots_stored": len(snapshots_log),
        "ai_enabled": groq_client is not None,
        "supabase_enabled": supabase_client is not None,
    }


# ============================================
# Health check
# ============================================
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "chronosheet-backend",
        "ai_enabled": groq_client is not None,
    }


# ============================================
# Version endpoint
# ============================================
@app.get("/version")
def get_version():
    return {
        "version": "0.3.0",
        "phase": "Phase 3 — AI Insights",
    }


# ============================================
# Upload spreadsheet endpoint (Phase 1)
# ============================================
@app.post("/upload-spreadsheet")
async def upload_spreadsheet(file: UploadFile = File(...)):
    """Read an Excel file and return its data."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Only .xlsx files are supported right now.",
        )

    try:
        contents = await file.read()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {error}")

    try:
        workbook = load_workbook(BytesIO(contents), data_only=True)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Could not parse Excel: {error}")

    if not workbook.sheetnames:
        raise HTTPException(status_code=400, detail="No sheets found in workbook.")

    # Helper: turn dates and datetimes into clean, readable strings.
    def format_cell(value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, datetime):
            if value.hour == 0 and value.minute == 0 and value.second == 0:
                return value.strftime("%Y-%m-%d")
            return value.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(value, date):
            return value.strftime("%Y-%m-%d")
        if isinstance(value, time):
            return value.strftime("%H:%M:%S")
        return value

    def is_empty_row(row: list[Any]) -> bool:
        for cell in row:
            if cell is not None and str(cell).strip() != "":
                return False
        return True

    # ------ Read EVERY sheet in the workbook ------
    all_sheets: list[dict[str, Any]] = []
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        if sheet is None:
            continue

        # Read all rows for this sheet
        sheet_all_rows: list[list[Any]] = []
        for row in sheet.iter_rows(values_only=True):
            cleaned_row = [format_cell(cell) for cell in row]
            sheet_all_rows.append(cleaned_row)

        # Auto-skip empty rows at top/bottom for this sheet
        s_top = 0
        while s_top < len(sheet_all_rows) and is_empty_row(sheet_all_rows[s_top]):
            s_top += 1

        s_bottom = 0
        while (
            s_bottom < len(sheet_all_rows) - s_top
            and is_empty_row(sheet_all_rows[len(sheet_all_rows) - 1 - s_bottom])
        ):
            s_bottom += 1

        end_idx = len(sheet_all_rows) - s_bottom
        sheet_rows = sheet_all_rows[s_top:end_idx]

        # Safety: prevent empty result from breaking UI
        if not sheet_rows and sheet_all_rows:
            sheet_rows = [["" for _ in range(len(sheet_all_rows[0]))]]
        elif not sheet_rows:
            sheet_rows = [[""]]

        all_sheets.append({
            "name": sheet_name,
            "row_count": len(sheet_rows),
            "column_count": len(sheet_rows[0]) if sheet_rows else 0,
            "data": sheet_rows,
            "skipped_top": s_top,
            "skipped_bottom": s_bottom,
        })

    if not all_sheets:
        raise HTTPException(status_code=400, detail="No valid sheets found.")

    # Use the first sheet as the "main" sheet for backwards compatibility
    main_sheet = all_sheets[0]

    # Build skip message for the main sheet only
    skip_notes: list[str] = []
    if main_sheet["skipped_top"] > 0:
        skip_notes.append(
            f"Skipped {main_sheet['skipped_top']} empty row at top"
        )
    if main_sheet["skipped_bottom"] > 0:
        skip_notes.append(
            f"Skipped {main_sheet['skipped_bottom']} empty row at bottom"
        )
    skip_message = f" ({'. '.join(skip_notes)})" if skip_notes else ""
    sheets_msg = (
        f" {len(all_sheets)} sheets found." if len(all_sheets) > 1 else ""
    )

    return {
        "success": True,
        "filename": file.filename,
        "sheet_name": main_sheet["name"],
        "row_count": main_sheet["row_count"],
        "column_count": main_sheet["column_count"],
        "data": main_sheet["data"],
        "skipped_top": main_sheet["skipped_top"],
        "skipped_bottom": main_sheet["skipped_bottom"],
        "sheets": all_sheets,
        "message": (
            f"Successfully parsed {file.filename}.{sheets_msg}"
            f" Found {main_sheet['row_count']} rows in '{main_sheet['name']}'.{skip_message}"
        ),
    }


# ============================================
# Snapshot endpoints (Phase 2 — Time Machine)
# ============================================
class SnapshotRequest(BaseModel):
    filename: str
    sheet_name: str
    data: list[list[Any]]
    row_count: int
    column_count: int
    changes_from_previous: int = 0
    note: str | None = None
    author: str | None = None  # Who is saving this version


@app.post("/save-snapshot")
def save_snapshot(snapshot: SnapshotRequest):
    """
    Append a new snapshot. Persists to Supabase if configured, otherwise
    stores in memory (lost on restart).
    """
    new_snapshot = {
        "id": str(uuid4()),
        "filename": snapshot.filename,
        "sheet_name": snapshot.sheet_name,
        "saved_at": datetime.now().isoformat(),
        "data": snapshot.data,
        "row_count": snapshot.row_count,
        "column_count": snapshot.column_count,
        "changes_from_previous": snapshot.changes_from_previous,
        "note": snapshot.note,
        "author": snapshot.author or "Anonymous",
    }

    # Try Supabase first if configured
    storage_used = "memory"
    if supabase_client:
        try:
            supabase_client.table(SUPABASE_TABLE).insert(new_snapshot).execute()
            storage_used = "supabase"
        except Exception as error:
            # Fall back to memory if Supabase fails
            print(f"[Supabase] Save failed, using memory: {error}")
            snapshots_log.append(new_snapshot)
    else:
        snapshots_log.append(new_snapshot)

    # Get total count (combine cloud + memory if both have data)
    total = len(snapshots_log)
    if supabase_client and storage_used == "supabase":
        try:
            count_result = supabase_client.table(SUPABASE_TABLE).select("id", count="exact").execute()
            total = count_result.count or 0
        except Exception:
            pass

    return {
        "success": True,
        "snapshot_id": new_snapshot["id"],
        "saved_at": new_snapshot["saved_at"],
        "total_snapshots": total,
        "storage": storage_used,
        "message": (
            f"Snapshot saved with {snapshot.changes_from_previous} change"
            f"{'s' if snapshot.changes_from_previous != 1 else ''}."
        ),
    }


@app.get("/snapshots")
def list_snapshots(filename: str | None = None):
    """List all snapshots, optionally filtered by filename. Pulls from Supabase if configured."""
    matching: list[dict[str, Any]] = []

    # Try Supabase first
    if supabase_client:
        try:
            query = supabase_client.table(SUPABASE_TABLE).select(
                "id, filename, sheet_name, saved_at, row_count, column_count, "
                "changes_from_previous, note, author"
            ).order("saved_at", desc=False)
            if filename:
                query = query.eq("filename", filename)
            result = query.execute()
            matching = result.data or []
        except Exception as error:
            print(f"[Supabase] List failed, using memory: {error}")
            matching = []

    # Append in-memory snapshots (for sessions before Supabase was set up)
    in_memory = (
        [s for s in snapshots_log if s["filename"] == filename] if filename
        else list(snapshots_log)
    )

    # Combine and dedupe by id
    seen_ids = {s["id"] for s in matching}
    for snap in in_memory:
        if snap["id"] not in seen_ids:
            matching.append({
                "id": snap["id"],
                "filename": snap["filename"],
                "sheet_name": snap["sheet_name"],
                "saved_at": snap["saved_at"],
                "row_count": snap["row_count"],
                "column_count": snap["column_count"],
                "changes_from_previous": snap["changes_from_previous"],
                "note": snap["note"],
                "author": snap.get("author", "Anonymous"),
            })

    return {
        "count": len(matching),
        "filename_filter": filename,
        "snapshots": matching,
        "storage": "supabase" if supabase_client else "memory",
    }


@app.get("/snapshot/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    """Return the full data of one snapshot. Checks Supabase first, then memory."""
    # Try Supabase first
    if supabase_client:
        try:
            result = supabase_client.table(SUPABASE_TABLE).select("*").eq(
                "id", snapshot_id
            ).limit(1).execute()
            if result.data:
                return result.data[0]
        except Exception as error:
            print(f"[Supabase] Get failed, checking memory: {error}")

    # Fall back to memory
    for snapshot in snapshots_log:
        if snapshot["id"] == snapshot_id:
            return snapshot

    raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_id} not found.")


# ============================================
# AI Analysis endpoint (Phase 3 — Groq Insights)
# ============================================
class AnalyzeRequest(BaseModel):
    """The shape of data the frontend sends when asking for AI analysis."""
    filename: str
    sheet_name: str
    data: list[list[Any]]


@app.post("/analyze-spreadsheet")
def analyze_spreadsheet(request: AnalyzeRequest):
    """
    Use Groq (Llama 3.3 70B) to analyze the spreadsheet and return insights.

    Returns:
    - Summary of what the data is about
    - Anomalies (outliers, unusual values)
    - Patterns and trends
    - Data quality issues
    - Recommendations

    Free, fast, and surprisingly insightful.
    """
    # Check that the AI is configured
    if not groq_client:
        raise HTTPException(
            status_code=500,
            detail=(
                "Artificial Intelligence is not configured. "
                "Add GROQ_API_KEY to backend/.env"
            ),
        )

    # Limit the data we send to avoid hitting token limits.
    # We will analyze the first 60 rows (usually enough for pattern detection).
    SAMPLE_LIMIT = 60
    sample = request.data[:SAMPLE_LIMIT]

    # Build a text representation of the spreadsheet that the model can read
    rows_text = []
    for index, row in enumerate(sample):
        row_str = " | ".join(str(cell) for cell in row)
        rows_text.append(f"Row {index + 1}: {row_str}")
    data_text = "\n".join(rows_text)

    # The prompt we send to the AI
    user_prompt = f"""You are an expert spreadsheet auditor and data analyst.

Analyze this spreadsheet carefully and return your insights as a strict JSON object.

File: {request.filename}
Sheet: {request.sheet_name}
Showing first {len(sample)} rows of {len(request.data)} total rows.

Data:
{data_text}

Return your analysis in this exact JSON structure (no markdown, no extra text, just valid JSON):
{{
  "summary": "A one-sentence overview of what this spreadsheet appears to be about",
  "anomalies": [
    "Unusual values, outliers, or things that don't fit the pattern. Mention specific row numbers when possible."
  ],
  "patterns": [
    "Notable trends, repeating values, or relationships between columns"
  ],
  "data_quality": [
    "Issues like empty cells, inconsistent formats, duplicates, suspicious entries"
  ],
  "recommendations": [
    "Concrete suggestions for the person who owns this data"
  ]
}}

Rules:
- Each list (anomalies, patterns, etc.) should have 2 to 5 items
- Be concise but insightful
- Be specific (mention row numbers, column names, actual values)
- If a category has no findings, return an empty list for it
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert spreadsheet auditor. "
                        "You respond ONLY in valid JSON, never in markdown or prose."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,  # Lower temperature for more consistent analysis
            max_tokens=2048,
        )

        ai_text = response.choices[0].message.content or "{}"
        analysis = json.loads(ai_text)

        return {
            "success": True,
            "filename": request.filename,
            "analyzed_rows": len(sample),
            "total_rows": len(request.data),
            "model": "llama-3.3-70b-versatile",
            "analysis": analysis,
        }

    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {error}",
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {error}",
        )


# ============================================
# AI Compare endpoint (Phase 3 — Compare two versions with AI)
# ============================================
class CompareRequest(BaseModel):
    """The shape of data sent when asking AI to compare two snapshots."""
    filename: str
    sheet_name: str
    past_data: list[list[Any]]
    current_data: list[list[Any]]
    past_label: str       # e.g., "Snapshot from May 31 at 8:00 PM"
    current_label: str    # e.g., "Current (editable) version"


def _col_letter(index: int) -> str:
    """Convert a 0-based column index into Excel-style letters."""
    result = ""
    n = index
    while n >= 0:
        result = chr(65 + (n % 26)) + result
        n = n // 26 - 1
    return result


@app.post("/compare-snapshots")
def compare_snapshots(request: CompareRequest):
    """
    Use Groq AI to compare two versions of a spreadsheet and explain
    what changed in plain English.
    """
    if not groq_client:
        raise HTTPException(
            status_code=500,
            detail="Artificial Intelligence is not configured.",
        )

    past = request.past_data
    current = request.current_data

    # Compute cell-by-cell differences
    rows_to_compare = min(len(past), len(current))
    cols_to_compare = min(
        len(past[0]) if past else 0,
        len(current[0]) if current else 0,
    )

    diffs: list[dict[str, Any]] = []
    for row_idx in range(rows_to_compare):
        for col_idx in range(cols_to_compare):
            past_value = (
                str(past[row_idx][col_idx]) if past[row_idx][col_idx] is not None else ""
            )
            current_value = (
                str(current[row_idx][col_idx])
                if current[row_idx][col_idx] is not None
                else ""
            )
            if past_value != current_value:
                diffs.append(
                    {
                        "cell": f"{_col_letter(col_idx)}{row_idx + 1}",
                        "row": row_idx + 1,
                        "column": _col_letter(col_idx),
                        "past": past_value,
                        "current": current_value,
                    }
                )

    structural_change = len(past) != len(current) or (
        (past[0] if past else []) != []
        and (current[0] if current else []) != []
        and len(past[0]) != len(current[0])
    )

    # Build a clean diff list for the AI prompt
    if diffs:
        diff_list_text = "\n".join(
            f"- {d['cell']}: '{d['past']}' → '{d['current']}'"
            for d in diffs[:60]  # Limit to first 60 to stay under token limit
        )
        if len(diffs) > 60:
            diff_list_text += f"\n... and {len(diffs) - 60} more changes"
    else:
        diff_list_text = "No cell-value differences detected."

    user_prompt = f"""You are comparing two versions of a spreadsheet.

File: {request.filename}
Sheet: {request.sheet_name}

PAST VERSION: {request.past_label}
  - Dimensions: {len(past)} rows x {len(past[0]) if past else 0} columns

CURRENT VERSION: {request.current_label}
  - Dimensions: {len(current)} rows x {len(current[0]) if current else 0} columns

Total cell changes: {len(diffs)}
Structural change: {"YES (rows/columns added or removed)" if structural_change else "NO"}

CHANGES:
{diff_list_text}

Respond with your analysis as a strict JSON object:
{{
  "summary": "1-2 sentence story of what changed between these versions",
  "key_changes": [
    "List 3-5 of the MOST notable changes in plain English",
    "Mention specific cells, values, and what they likely represent",
    "Example: 'Sales for January 5 increased from 0 to 6000'"
  ],
  "patterns": [
    "What patterns or themes emerge from the changes?",
    "Examples: all in one column, mostly increases, structural reorganization"
  ],
  "impact": [
    "What is the likely real-world impact of these changes?",
    "Example: total revenue affected, important corrections, audit risks"
  ]
}}

Rules:
- Strict JSON only, no markdown
- Each list 2 to 5 items
- Be specific (mention cells, values)
- Empty list is OK if nothing meaningful for that category
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert spreadsheet auditor comparing two versions. "
                        "You respond ONLY in valid JSON, never in markdown or prose."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2048,
        )

        ai_text = response.choices[0].message.content or "{}"
        analysis = json.loads(ai_text)

        return {
            "success": True,
            "filename": request.filename,
            "total_changes": len(diffs),
            "structural_change": structural_change,
            "past_label": request.past_label,
            "current_label": request.current_label,
            "diffs_sample": diffs[:30],
            "analysis": analysis,
        }

    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {error}",
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI comparison failed: {error}",
        )


# ============================================
# Export endpoint — Wave 2: Download as .xlsx
# ============================================
class ExportRequest(BaseModel):
    """Payload for exporting current data back to an Excel file."""
    filename: str
    sheet_name: str
    data: list[list[Any]]


@app.post("/export-spreadsheet")
def export_spreadsheet(request: ExportRequest):
    """
    Build a fresh .xlsx workbook from the user's edited data and stream
    it back to the browser as a download.
    """
    # Create a new workbook with one sheet
    workbook = Workbook()
    sheet = workbook.active
    if sheet is None:
        raise HTTPException(status_code=500, detail="Failed to create sheet.")

    # Set the sheet name (sanitize: Excel doesn't allow some characters)
    safe_sheet_name = (request.sheet_name or "Sheet1")[:31]
    for invalid_char in r"\/?*[]:":
        safe_sheet_name = safe_sheet_name.replace(invalid_char, "_")
    sheet.title = safe_sheet_name

    # Write every row from the request
    for row in request.data:
        sheet.append(list(row))

    # Save to an in-memory buffer
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    # Build the download filename — branded with "_chronosheet_edited"
    base = request.filename
    if base.lower().endswith(".xlsx"):
        base = base[:-5]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    download_filename = f"{base}_{timestamp}_chronosheet_edited.xlsx"

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
        },
    )


# ============================================
# Chat with Spreadsheet — Wave 3 Feature 1
# ============================================
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Payload for asking AI a question about a spreadsheet."""
    filename: str
    sheet_name: str
    data: list[list[Any]]
    question: str
    history: list[ChatMessage] = []  # Previous chat turns for context


@app.post("/chat-with-spreadsheet")
def chat_with_spreadsheet(request: ChatRequest):
    """
    Use Groq AI to answer questions about a spreadsheet in plain English.
    Supports multi-turn conversation via history.
    """
    if not groq_client:
        raise HTTPException(
            status_code=500,
            detail="Artificial Intelligence is not configured.",
        )

    # Limit data sent to AI to avoid token limits
    SAMPLE_LIMIT = 80
    sample = request.data[:SAMPLE_LIMIT]

    # Build readable text view of the spreadsheet
    rows_text: list[str] = []
    for index, row in enumerate(sample):
        row_str = " | ".join(str(cell) for cell in row)
        rows_text.append(f"Row {index + 1}: {row_str}")
    data_text = "\n".join(rows_text)

    # System message tells the AI how to behave
    system_prompt = f"""You are a sharp, direct data assistant. The user has uploaded a spreadsheet and asks quick questions about it.

File: {request.filename}
Sheet: {request.sheet_name}
Total rows: {len(request.data)}

SPREADSHEET DATA:
{data_text}

CRITICAL RESPONSE RULES:
- ALWAYS lead with the DIRECT ANSWER in the FIRST sentence.
- Keep responses to 1-2 sentences MAXIMUM for simple factual questions ("what is", "how many", "which day", etc.).
- Use up to 3 short sentences only when reasoning is genuinely needed.
- NEVER explain your reasoning step-by-step unless explicitly asked.
- NEVER say "I'll look at...", "Let me check...", or "Among these...". Just give the answer.
- Format numbers cleanly with commas (e.g., "12,000" not "12000").
- For "best/highest/largest", state the row, value, and date directly.
- If the question is unclear or unanswerable from the data, say so in ONE sentence.
- Skip header rows and totals/summary rows (rows with no date) when finding "best" values.
- Be confident and decisive. Sound like a quick Slack reply, not an essay.

EXAMPLE GOOD ANSWERS:
Q: "What was my best sales day?"
A: "Your best sales day was 2026-01-04 with 12,000 in sales."

Q: "How many days had zero sales?"
A: "18 days had zero sales."

Q: "What is the total sales for the month?"
A: "Total sales for the month: 74,000."

EXAMPLE BAD ANSWERS (do NOT do this):
- "To find your best sales day, I'll look at..." ← NO!
- "First, let me check the columns..." ← NO!
- Long paragraph explaining reasoning ← NO!"""

    # Build the messages list for the AI
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt}
    ]

    # Add previous conversation turns
    for turn in request.history[-10:]:  # Keep last 10 turns for context
        messages.append({"role": turn.role, "content": turn.content})

    # Add the current question
    messages.append({"role": "user", "content": request.question})

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,  # type: ignore[arg-type]
            temperature=0.4,
            max_tokens=1024,
        )

        answer = response.choices[0].message.content or ""

        return {
            "success": True,
            "answer": answer,
            "model": "llama-3.3-70b-versatile",
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI chat failed: {error}",
        )


# ============================================
# Suggest Chart endpoint — Wave 3 Feature 2
# ============================================
class ChartSuggestRequest(BaseModel):
    """Payload for asking AI which chart best represents the data."""
    filename: str
    sheet_name: str
    data: list[list[Any]]


@app.post("/suggest-chart")
def suggest_chart(request: ChartSuggestRequest):
    """
    Use Groq AI to look at the spreadsheet and pick:
    - The best chart type (bar / line / pie / area)
    - Which column should be the x-axis (categories or time)
    - Which column should be the y-axis (numeric values)
    - A friendly chart title
    """
    if not groq_client:
        raise HTTPException(
            status_code=500,
            detail="Artificial Intelligence is not configured.",
        )

    # Send a representative sample
    sample = request.data[:40]
    rows_text: list[str] = []
    for index, row in enumerate(sample):
        row_str = " | ".join(str(cell) for cell in row)
        rows_text.append(f"Row {index + 1}: {row_str}")
    data_text = "\n".join(rows_text)

    num_columns = len(request.data[0]) if request.data else 0
    col_labels = [_col_letter(i) for i in range(num_columns)]

    user_prompt = f"""You are a data visualization expert. Look at this spreadsheet and decide the BEST way to visualize it as a chart.

File: {request.filename}
Total rows: {len(request.data)}
Showing first {len(sample)} rows.

Columns available (0-indexed): {", ".join(f"{i}={col_labels[i]}" for i in range(num_columns))}

Data:
{data_text}

Return STRICT JSON in this exact structure:
{{
  "chart_type": "bar" or "line" or "pie" or "area",
  "title": "A clear title for the chart",
  "x_column": <0-indexed column number for x-axis>,
  "y_column": <0-indexed column number for y-axis>,
  "x_label": "Friendly name for the x-axis",
  "y_label": "Friendly name for the y-axis",
  "reasoning": "1 sentence explaining why this is the best chart"
}}

Rules:
- Use "line" or "area" if x-column is a date or time
- Use "bar" for categorical x-column with numeric y
- Use "pie" only if there are few distinct x values (under 10)
- y_column MUST be a column with numeric values
- x_column MUST be a column with identifiers (dates, names, categories)
- If the first row looks like header labels, skip them for value analysis
- Pick the MOST INTERESTING / MEANINGFUL chart for THIS specific data
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a data visualization expert. Respond ONLY in valid JSON, no markdown.",
                },
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=512,
        )

        suggestion = json.loads(response.choices[0].message.content or "{}")

        return {
            "success": True,
            "suggestion": suggestion,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Chart suggestion failed: {error}",
        )
