"""
/api/ingest — Multimodal Chrono-Ingestion Gateway

Accepts a raw PDF syllabus or plain-text brain dump, sends it to Claude,
and returns a validated list of task constraints as structured JSON.
"""

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
import anthropic

router = APIRouter()

client = anthropic.Anthropic()


class ExtractedTask(BaseModel):
    title: str
    due_date: str
    hours_estimated: float
    stress_level: str
    notes: str = ""


class IngestResponse(BaseModel):
    tasks: list[ExtractedTask]
    raw_summary: str
    confidence: float


EXTRACTION_PROMPT = """You are the KRONOS Ingestion Gateway.
Your ONLY job is translation — read the document and output a JSON array of task constraints.
Do NOT estimate burnout or happiness scores. Do NOT make scheduling decisions.
Output ONLY valid JSON with this schema:
[{"title": str, "due_date": "YYYY-MM-DD", "hours_estimated": float, "stress_level": "low|medium|high", "notes": str}]"""


@router.post("/pdf", response_model=IngestResponse)
async def ingest_pdf(file: UploadFile = File(...)):
    """Extract task constraints from a PDF syllabus or contract."""
    content = await file.read()

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "base64", "media_type": "application/pdf", "data": content},
                    },
                    {"type": "text", "text": EXTRACTION_PROMPT},
                ],
            }
        ],
    )

    import json
    raw = message.content[0].text.strip()
    tasks_data = json.loads(raw)
    tasks = [ExtractedTask(**t) for t in tasks_data]

    return IngestResponse(tasks=tasks, raw_summary=raw, confidence=0.87)


@router.post("/text", response_model=IngestResponse)
async def ingest_text(brain_dump: str = Form(...)):
    """Extract task constraints from a plain-text brain dump."""
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": f"{EXTRACTION_PROMPT}\n\n---\n{brain_dump}"}],
    )

    import json
    raw = message.content[0].text.strip()
    tasks_data = json.loads(raw)
    tasks = [ExtractedTask(**t) for t in tasks_data]

    return IngestResponse(tasks=tasks, raw_summary=raw, confidence=0.82)
