"""
/api/velocity — Passive Focus Timer & η₀ Updater

POST /api/velocity/record
  Receives a {estimated_hours, actual_hours, task_id, category} payload from
  the "Start Task / End Task" Focus Mode stopwatch. Silently updates the user's
  Bounded-Rationality efficiency baseline (η₀) — no popups, no surveys.

GET  /api/velocity/profile
  Returns the user's current η₀ and per-category velocity ratios.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, VelocityRecord

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class VelocityPayload(BaseModel):
    user_id: int
    task_id: int | None = None
    category: str = "General"
    estimated_hours: float = Field(gt=0)
    actual_hours: float = Field(gt=0)


class VelocityResponse(BaseModel):
    velocity_ratio: float       # actual / estimated — >1 means slower than planned
    new_eta_0: float            # updated efficiency baseline
    message: str


class VelocityProfile(BaseModel):
    user_id: int
    eta_0: float
    category_ratios: dict[str, float]   # {category: avg_velocity_ratio}
    total_records: int


# ── η₀ update logic ──────────────────────────────────────────────────────────

def _recompute_eta_0(records: list[VelocityRecord]) -> float:
    """
    η₀ = harmonic mean of velocity ratios, capped at [0.3, 1.0].
    Slower execution → lower η₀ → efficiency decay kicks in earlier.
    """
    if not records:
        return 1.0
    # Use last 20 records for rolling window
    recent = records[-20:]
    # velocity_ratio = actual/estimated; invert for efficiency (faster = higher η)
    efficiency_values = [1.0 / max(0.1, r.velocity_ratio) for r in recent]
    avg = sum(efficiency_values) / len(efficiency_values)
    return round(min(1.0, max(0.3, avg)), 4)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/record", response_model=VelocityResponse)
def record_velocity(body: VelocityPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    ratio = round(body.actual_hours / body.estimated_hours, 4)

    record = VelocityRecord(
        user_id=body.user_id,
        task_id=body.task_id,
        category=body.category,
        estimated_hours=body.estimated_hours,
        actual_hours=body.actual_hours,
        velocity_ratio=ratio,
    )
    db.add(record)

    # Recompute η₀ from all user records
    all_records = (
        db.query(VelocityRecord)
        .filter(VelocityRecord.user_id == body.user_id)
        .order_by(VelocityRecord.created_at)
        .all()
    )
    all_records.append(record)
    new_eta_0 = _recompute_eta_0(all_records)

    user.eta_0 = new_eta_0
    db.commit()

    if ratio > 1.2:
        msg = f"Focus Mode: task took {ratio:.1f}× longer than planned. Efficiency baseline updated."
    elif ratio < 0.8:
        msg = f"Focus Mode: you finished {1/ratio:.1f}× faster than planned. Nice. Baseline updated."
    else:
        msg = "Focus Mode: on track. Efficiency baseline updated."

    return VelocityResponse(velocity_ratio=ratio, new_eta_0=new_eta_0, message=msg)


@router.get("/profile", response_model=VelocityProfile)
def get_velocity_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    records = db.query(VelocityRecord).filter(VelocityRecord.user_id == user_id).all()

    # Per-category average velocity ratio
    cat_map: dict[str, list[float]] = {}
    for r in records:
        cat_map.setdefault(r.category, []).append(r.velocity_ratio)
    cat_ratios = {cat: round(sum(vals) / len(vals), 3) for cat, vals in cat_map.items()}

    return VelocityProfile(
        user_id=user_id,
        eta_0=user.eta_0,
        category_ratios=cat_ratios,
        total_records=len(records),
    )
