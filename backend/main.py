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
        "http://localhost:3000",
        "http://192.168.0.106:3000",
    ],
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
        sheet = workbook.active
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Could not parse Excel: {error}")

    if sheet is None:
        raise HTTPException(status_code=400, detail="No active sheet found.")

    # Helper: turn dates and datetimes into clean, readable strings.
    # If the time is midnight (00:00:00), we treat it as just a date.
    def format_cell(value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, datetime):
            # If the time portion is just midnight, output as date only
            if value.hour == 0 and value.minute == 0 and value.second == 0:
                return value.strftime("%Y-%m-%d")
            return value.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(value, date):
            return value.strftime("%Y-%m-%d")
        if isinstance(value, time):
            return value.strftime("%H:%M:%S")
        return value

    # Read every row from the Excel sheet
    all_rows: list[list[Any]] = []
    for row in sheet.iter_rows(values_only=True):
        cleaned_row = [format_cell(cell) for cell in row]
        all_rows.append(cleaned_row)

    # ------ Auto-skip empty rows at TOP and BOTTOM ------
    # We only strip empty rows at the edges. Empty rows in the middle stay because
    # they might be intentional separators or visual spacing.
    def is_empty_row(row: list[Any]) -> bool:
        """A row is empty when every cell is empty/whitespace-only."""
        for cell in row:
            if cell is not None and str(cell).strip() != "":
                return False
        return True

    skipped_top = 0
    while skipped_top < len(all_rows) and is_empty_row(all_rows[skipped_top]):
        skipped_top += 1

    skipped_bottom = 0
    while (
        skipped_bottom < len(all_rows) - skipped_top
        and is_empty_row(all_rows[len(all_rows) - 1 - skipped_bottom])
    ):
        skipped_bottom += 1

    end_index = len(all_rows) - skipped_bottom
    rows = all_rows[skipped_top:end_index]

    # Safety: if the file was completely empty, return one empty row so UI does not break
    if not rows and all_rows:
        rows = [["" for _ in range(len(all_rows[0]))]]
    elif not rows:
        rows = [[""]]

    # Build a friendly skip message (only shows if something was skipped)
    skip_notes: list[str] = []
    if skipped_top > 0:
        skip_notes.append(
            f"Skipped {skipped_top} empty row{'s' if skipped_top > 1 else ''} at top"
        )
    if skipped_bottom > 0:
        skip_notes.append(
            f"Skipped {skipped_bottom} empty row{'s' if skipped_bottom > 1 else ''} at bottom"
        )
    skip_message = f" ({'. '.join(skip_notes)})" if skip_notes else ""

    return {
        "success": True,
        "filename": file.filename,
        "sheet_name": sheet.title,
        "row_count": len(rows),
        "column_count": len(rows[0]) if rows else 0,
        "data": rows,
        "skipped_top": skipped_top,
        "skipped_bottom": skipped_bottom,
        "message": (
            f"Successfully parsed {file.filename}. Found {len(rows)} rows.{skip_message}"
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
    """Append a new snapshot to the Raft-style log."""
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
    snapshots_log.append(new_snapshot)
    return {
        "success": True,
        "snapshot_id": new_snapshot["id"],
        "saved_at": new_snapshot["saved_at"],
        "total_snapshots": len(snapshots_log),
        "message": (
            f"Snapshot saved with {snapshot.changes_from_previous} change"
            f"{'s' if snapshot.changes_from_previous != 1 else ''}."
        ),
    }


@app.get("/snapshots")
def list_snapshots(filename: str | None = None):
    """List all snapshots, optionally filtered by filename."""
    if filename:
        matching = [s for s in snapshots_log if s["filename"] == filename]
    else:
        matching = list(snapshots_log)

    summaries = [
        {
            "id": s["id"],
            "filename": s["filename"],
            "sheet_name": s["sheet_name"],
            "saved_at": s["saved_at"],
            "row_count": s["row_count"],
            "column_count": s["column_count"],
            "changes_from_previous": s["changes_from_previous"],
            "note": s["note"],
            "author": s.get("author", "Anonymous"),
        }
        for s in matching
    ]
    return {
        "count": len(summaries),
        "filename_filter": filename,
        "snapshots": summaries,
    }


@app.get("/snapshot/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    """Return the full data of one snapshot."""
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
