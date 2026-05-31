"""
ChronoSheet Backend — main.py
==============================
The brain of ChronoSheet.

What lives here:
- Welcome / health / version endpoints
- Upload spreadsheet endpoint (Phase 1)
- Snapshot save / list / get endpoints (Phase 2 — Time Machine)

Architecture note (Day Zero):
- We are using IN-MEMORY storage for snapshots (a Python list).
- This is the Raft "log" concept applied to spreadsheets:
    each saved snapshot is an entry in an append-only log.
- The full spreadsheet at any point in time = "the Key-Value Store"
    at that point.
- Later we will replace this in-memory list with Supabase so snapshots
  survive backend restarts.
"""

from datetime import datetime
from io import BytesIO
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openpyxl import load_workbook
from pydantic import BaseModel

# ============================================
# Create the FastAPI application
# ============================================
app = FastAPI(
    title="ChronoSheet API",
    description="The intelligent history layer for spreadsheets.",
    version="0.2.0",
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
)


# ============================================
# In-memory snapshot storage (the "Raft log")
# ============================================
# Each entry in this list is one saved version of a spreadsheet.
# Entries are append-only: we never modify or delete old ones.
# This is exactly how Raft's log works.
snapshots_log: list[dict[str, Any]] = []


# ============================================
# Welcome endpoint
# ============================================
@app.get("/")
def welcome():
    """Friendly hello + snapshot count for visibility."""
    return {
        "name": "ChronoSheet API",
        "version": "0.2.0",
        "status": "alive",
        "message": "Welcome to ChronoSheet — Spreadsheets That Remember.",
        "docs": "Visit /docs to see all available endpoints.",
        "snapshots_stored": len(snapshots_log),
    }


# ============================================
# Health check
# ============================================
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "chronosheet-backend"}


# ============================================
# Version endpoint
# ============================================
@app.get("/version")
def get_version():
    return {
        "version": "0.2.0",
        "phase": "Phase 2 — Time Machine",
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

    rows = []
    for row in sheet.iter_rows(values_only=True):
        cleaned_row = [cell if cell is not None else "" for cell in row]
        rows.append(cleaned_row)

    return {
        "success": True,
        "filename": file.filename,
        "sheet_name": sheet.title,
        "row_count": len(rows),
        "column_count": len(rows[0]) if rows else 0,
        "data": rows,
        "message": f"Successfully parsed {file.filename}. Found {len(rows)} rows.",
    }


# ============================================
# Snapshot data shape (Phase 2)
# ============================================
class SnapshotRequest(BaseModel):
    """The shape of data the frontend sends when saving a snapshot."""
    filename: str
    sheet_name: str
    data: list[list[Any]]
    row_count: int
    column_count: int
    changes_from_previous: int = 0
    note: str | None = None  # Optional user-written note about this version


# ============================================
# Save a snapshot — Phase 2 endpoint
# ============================================
@app.post("/save-snapshot")
def save_snapshot(snapshot: SnapshotRequest):
    """
    Append a new snapshot to the Raft-style log.

    Each call here is like a Raft log entry:
    - Append-only (we never modify old entries)
    - Has a unique ID
    - Has a timestamp
    - Preserves the full state at this moment in time

    Returns the new snapshot ID and the total count of stored snapshots.
    """
    new_snapshot = {
        "id": str(uuid4()),                            # Unique fingerprint
        "filename": snapshot.filename,
        "sheet_name": snapshot.sheet_name,
        "saved_at": datetime.now().isoformat(),        # Timestamp
        "data": snapshot.data,                          # The full state
        "row_count": snapshot.row_count,
        "column_count": snapshot.column_count,
        "changes_from_previous": snapshot.changes_from_previous,
        "note": snapshot.note,
    }

    # APPEND-ONLY — this is the heart of the Raft log concept
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


# ============================================
# List all snapshots for a given filename
# ============================================
@app.get("/snapshots")
def list_snapshots(filename: str | None = None):
    """
    Return summaries of all snapshots. If filename is given, only return
    snapshots for that file. Order: oldest first (chronological).

    We exclude the heavy "data" field from this list to keep it fast —
    you only download the full data when picking a specific snapshot.
    """
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
        }
        for s in matching
    ]

    return {
        "count": len(summaries),
        "filename_filter": filename,
        "snapshots": summaries,
    }


# ============================================
# Get one full snapshot by its ID (time travel!)
# ============================================
@app.get("/snapshot/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    """
    Return the full data of one specific snapshot.
    This is what the time-travel slider will call when the user
    drags it to a past moment — "give me the spreadsheet as it was".
    """
    for snapshot in snapshots_log:
        if snapshot["id"] == snapshot_id:
            return snapshot
    raise HTTPException(
        status_code=404,
        detail=f"Snapshot {snapshot_id} not found.",
    )
