"""
/api/voice — Live & batch speech-to-text via Spitch API

WS  /api/voice/live       — stream WAV chunks → live partial transcripts
POST /api/voice/transcribe — one-shot audio file → transcript
"""

import asyncio
import json

from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from config import settings

router = APIRouter()


def _get_spitch():
    if not settings.SPITCH_API_KEY:
        raise HTTPException(status_code=503, detail="SPITCH_API_KEY not configured.")
    from spitch import Spitch  # lazy import so missing key gives a clean 503
    return Spitch(api_key=settings.SPITCH_API_KEY)


async def _transcribe_bytes(audio_bytes: bytes, language: str = "en") -> str:
    client = _get_spitch()
    loop = asyncio.get_event_loop()
    # Spitch SDK is sync — run in thread pool to avoid blocking the event loop
    response = await loop.run_in_executor(
        None,
        lambda: client.speech.transcribe(content=audio_bytes, language=language),
    )
    return (response.text or "").strip()


class TranscribeResponse(BaseModel):
    transcript: str
    language: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...), language: str = "en"):
    """One-shot transcription: upload audio (wav/mp3/m4a/ogg), get transcript."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file.")
    transcript = await _transcribe_bytes(audio_bytes, language)
    return TranscribeResponse(transcript=transcript, language=language)


# ── WebSocket live transcription ─────────────────────────────────────────────
#
# Protocol — client → server:
#   text {"type":"chunk",       "language":"en"} followed immediately by binary WAV bytes
#   text {"type":"chunk_final", "language":"en"} followed immediately by binary WAV bytes (last chunk)
#   text {"type":"stop"}                         — flush & close (no more audio coming)
#
# Protocol — server → client:
#   {"type":"partial", "text":"..."}  — transcript updated after each chunk
#   {"type":"final",   "text":"..."}  — complete transcript, connection will close
#   {"type":"error",   "message":"..."} — non-fatal; recording continues
#   {"type":"ping"}                   — keep-alive

@router.websocket("/live")
async def live_transcription(ws: WebSocket):
    await ws.accept()

    accumulated = ""       # running full transcript across all chunks
    language = "en"
    expect_audio = False   # True when we just received a chunk control msg
    is_final_chunk = False # whether the pending chunk is the last one

    try:
        while True:
            try:
                message = await asyncio.wait_for(ws.receive(), timeout=30.0)
            except asyncio.TimeoutError:
                try:
                    await ws.send_json({"type": "ping"})
                except Exception:
                    break
                continue

            msg_type = message.get("type")
            if msg_type == "websocket.disconnect":
                break

            if msg_type != "websocket.receive":
                continue

            raw_bytes = message.get("bytes")
            raw_text = message.get("text")

            # ── Binary frame: audio payload following a chunk control msg ──
            if raw_bytes and expect_audio:
                expect_audio = False
                if raw_bytes:
                    try:
                        chunk_transcript = await _transcribe_bytes(raw_bytes, language)
                    except HTTPException as exc:
                        await ws.send_json({"type": "error", "message": exc.detail})
                        if is_final_chunk:
                            await ws.send_json({"type": "final", "text": accumulated})
                            break
                        continue

                    if chunk_transcript:
                        accumulated = (accumulated + " " + chunk_transcript).strip()

                    if is_final_chunk:
                        await ws.send_json({"type": "final", "text": accumulated})
                        break
                    else:
                        await ws.send_json({"type": "partial", "text": accumulated})

            # ── Text frame: control message ──
            elif raw_text:
                try:
                    ctrl = json.loads(raw_text)
                except json.JSONDecodeError:
                    continue

                ctrl_type = ctrl.get("type", "")

                if ctrl_type in ("chunk", "chunk_final"):
                    language = ctrl.get("language", language)
                    expect_audio = True
                    is_final_chunk = ctrl_type == "chunk_final"

                elif ctrl_type == "stop":
                    # Client stopped without sending a chunk_final — emit what we have
                    await ws.send_json({"type": "final", "text": accumulated})
                    break

    except WebSocketDisconnect:
        pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass
