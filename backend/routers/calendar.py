"""
/api/calendar — Bi-directional Google Calendar sync

GET  /api/calendar/events      → fetch user's fixed events (14-day window)
POST /api/calendar/write       → batch-insert optimized schedule blocks
DELETE /api/calendar/kronos    → remove all KRONOS-inserted events
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.google_oauth import build_calendar_service
from database import get_db
from models import User, CalendarEvent

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class FixedEventOut(BaseModel):
    id: str
    title: str
    start_dt: str
    end_dt: str
    is_fixed: bool = True


class CalendarBlock(BaseModel):
    task_id: str
    title: str
    date: str           # YYYY-MM-DD
    start_hour: float   # e.g. 9.0 = 09:00
    end_hour: float


class WriteRequest(BaseModel):
    user_id: int
    blocks: list[CalendarBlock]
    scenario_cache_id: int | None = None
    timezone: str = "UTC"   # IANA tz string e.g. "Africa/Lagos", "America/New_York"


class WriteResponse(BaseModel):
    inserted: int
    failed: int
    event_ids: list[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.access_token:
        raise HTTPException(status_code=401, detail="User has not authenticated with Google Calendar.")
    return user


def _float_hour_to_naive_iso(date_str: str, hour: float) -> str:
    """
    Convert '2026-06-19' + 9.5 → '2026-06-19T09:30:00' (no timezone suffix).
    Google Calendar treats this as local time when timeZone is also specified.
    """
    h = int(hour)
    m = int(round((hour - h) * 60))
    return f"{date_str}T{h:02d}:{m:02d}:00"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/events")
def get_calendar_events(
    user_id: int = Query(...),
    days: int = Query(default=14, ge=1, le=30),
    db: Session = Depends(get_db),
) -> list[FixedEventOut]:
    """Fetch the user's primary Google Calendar events and cache them as fixed blocks."""
    user = _get_user_or_404(user_id, db)

    service = build_calendar_service(user.access_token, user.refresh_token, user.token_expiry)

    now = datetime.now(timezone.utc)
    time_max = now + timedelta(days=days)

    try:
        result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        ).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Google Calendar API error: {exc}")

    items = result.get("items", [])

    # Cache in DB (replace existing)
    db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id, CalendarEvent.is_fixed == True).delete()

    events_out: list[FixedEventOut] = []
    for ev in items:
        start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date", "")
        end   = ev.get("end",   {}).get("dateTime") or ev.get("end",   {}).get("date", "")
        title = ev.get("summary", "Untitled")
        gid   = ev.get("id", "")

        db_ev = CalendarEvent(
            user_id=user_id,
            google_event_id=gid,
            title=title,
            start_dt=start,
            end_dt=end,
            is_fixed=True,
        )
        db.add(db_ev)
        events_out.append(FixedEventOut(id=gid, title=title, start_dt=start, end_dt=end))

    db.commit()
    return events_out


@router.post("/write", response_model=WriteResponse)
def write_calendar_events(body: WriteRequest, db: Session = Depends(get_db)):
    """Batch-insert optimized schedule blocks into Google Calendar."""
    user = _get_user_or_404(body.user_id, db)
    service = build_calendar_service(user.access_token, user.refresh_token, user.token_expiry)

    # Auto-detect user's calendar timezone if caller didn't specify
    tz = body.timezone
    if tz == "UTC":
        try:
            cal_settings = service.calendars().get(calendarId="primary").execute()
            tz = cal_settings.get("timeZone", "UTC")
        except Exception:
            pass

    inserted: list[str] = []
    failed = 0

    for block in body.blocks:
        try:
            start_iso = _float_hour_to_naive_iso(block.date, block.start_hour)
            end_iso   = _float_hour_to_naive_iso(block.date, block.end_hour)

            event_body = {
                "summary":     f"[KRONOS] {block.title}",
                "description": "Scheduled by KRONOS Arbitrage Engine",
                "start": {"dateTime": start_iso, "timeZone": tz},
                "end":   {"dateTime": end_iso,   "timeZone": tz},
                "extendedProperties": {
                    "private": {
                        "kronos": "true",
                        "task_id": block.task_id,
                    }
                },
            }

            created = service.events().insert(calendarId="primary", body=event_body).execute()
            inserted.append(created.get("id", ""))

            # Persist to local cache as a non-fixed KRONOS event
            db.add(CalendarEvent(
                user_id=body.user_id,
                google_event_id=created.get("id", ""),
                title=f"[KRONOS] {block.title}",
                start_dt=start_iso,
                end_dt=end_iso,
                is_fixed=False,
            ))

        except Exception:
            failed += 1

    db.commit()
    return WriteResponse(inserted=len(inserted), failed=failed, event_ids=inserted)


@router.delete("/kronos")
def delete_kronos_events(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Remove all KRONOS-scheduled events from Google Calendar."""
    user = _get_user_or_404(user_id, db)
    service = build_calendar_service(user.access_token, user.refresh_token, user.token_expiry)

    kronos_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.is_fixed == False,
    ).all()

    deleted = 0
    for ev in kronos_events:
        if ev.google_event_id:
            try:
                service.events().delete(calendarId="primary", eventId=ev.google_event_id).execute()
                deleted += 1
            except Exception:
                pass
        db.delete(ev)

    db.commit()
    return {"deleted": deleted}
