"""
/api/ingest — Multimodal Chrono-Ingestion Gateway

Uses Gemini-2.5-Flash Structured Outputs API to force raw PDFs, text, or
audio transcripts into the rigid PRD JSON schema. Never triggers the
simulation ring directly — returns JSON for frontend Human-in-the-Loop table.

POST /api/ingest/pdf   — multipart/form-data, field: file (PDF)
POST /api/ingest/text  — form field: content (plain text or audio transcript)
"""

import json
import base64
from datetime import date
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from google import genai
from google.genai import types as genai_types
from pypdf import PdfReader

from config import settings

router = APIRouter()

_gemini_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured.")
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client

# Strict JSON schema enforced by Gemini Structured Outputs
TASK_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title":            {"type": "string"},
                    "due_date":         {"type": "string"},    # YYYY-MM-DD
                    "workload_hours":   {"type": "number"},
                    "cognitive_weight": {"type": "number"},    # 1.0–3.0
                    "is_flexible":      {"type": "boolean"},
                    "category":         {"type": "string"},
                },
                "required": ["title", "due_date", "workload_hours", "cognitive_weight", "is_flexible"],
            },
        }
    },
    "required": ["tasks"],
}

def _system_prompt() -> str:
    today = date.today().isoformat()
    return f"""You are the KRONOS Ingestion Gateway — a zero-shot data extractor.
Today's date is {today}. Read the provided document and extract every task, assignment, exam, project, or commitment.

Rules (STRICT):
1. Output ONLY valid JSON matching the schema — no prose, no markdown.
2. due_date must be ISO format YYYY-MM-DD. If a year is missing, use the year from today's date ({today[:4]}).
3. workload_hours: realistic preparation hours for a student (not the exam duration).
   - Short essay (≤1000 words): 3–5h. Long essay (2000+ words): 6–10h.
   - Problem set / assignment: 2–6h. Exam prep: 8–20h. Reading chapter: 1–3h.
   - Never exceed 40h for a single task.
4. cognitive_weight: 1.0 = light reading/review, 2.0 = focused problem sets, 3.0 = high-stakes exams/complex projects.
5. is_flexible: false only if the event is a fixed time slot (lecture, exam sitting, scheduled meeting).
6. category: classify as one of Math, Writing, Coding, Reading, Research, Lab, Meeting, Other.
7. Never hallucinate deadlines — omit tasks whose dates are ambiguous."""


def _extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _call_gemini(prompt: str) -> dict:
    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=_system_prompt(),
                response_mime_type="application/json",
                response_schema=TASK_RESPONSE_SCHEMA,
            ),
        )
        return json.loads(response.text)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini extraction failed: {exc}",
        )


# ── Response schema ──────────────────────────────────────────────────────────

class ExtractedTask(BaseModel):
    title: str
    due_date: str
    workload_hours: float = Field(ge=0.5, le=200.0)
    cognitive_weight: float = Field(default=1.0, ge=1.0, le=3.0)
    is_flexible: bool = True
    category: str = "General"


class IngestResponse(BaseModel):
    tasks: list[ExtractedTask]
    source_type: str
    task_count: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/pdf", response_model=IngestResponse)
async def ingest_pdf(file: UploadFile = File(...)):
    """Extract tasks from a PDF syllabus using Gemini Structured Outputs."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    text = _extract_pdf_text(raw_bytes)
    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    payload = _call_gemini(f"Extract all tasks from this document:\n\n{text[:12000]}")
    tasks = [ExtractedTask(**t) for t in payload.get("tasks", [])]

    return IngestResponse(tasks=tasks, source_type="pdf", task_count=len(tasks))


@router.post("/text", response_model=IngestResponse)
async def ingest_text(content: str = Form(...)):
    """Extract tasks from a plain-text brain dump or audio transcript."""
    if len(content.strip()) < 10:
        raise HTTPException(status_code=400, detail="Content too short to extract tasks.")

    payload = _call_gemini(f"Extract all tasks from this text:\n\n{content[:12000]}")
    tasks = [ExtractedTask(**t) for t in payload.get("tasks", [])]

    return IngestResponse(tasks=tasks, source_type="text", task_count=len(tasks))
