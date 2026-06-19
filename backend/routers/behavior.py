"""
/api/behavior — Behavioral Avoidance Detection & Cognitive Weight Escalation

POST /api/behavior/snooze
  Called when a user pushes a task to tomorrow.
  If the same task CATEGORY has been snoozed ≥ 3 times, permanently
  scales up cognitive_weight (wᵢ) for all future tasks in that category.

GET  /api/behavior/weights
  Returns the current behavioral weight multipliers for all categories.

POST /api/behavior/reset
  Resets a specific category's snooze counter (admin/debug use).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import BehavioralWeight, Task

router = APIRouter()

SNOOZE_TRIGGER_COUNT = 3        # snoozes before penalty kicks in
WEIGHT_ESCALATION_STEP = 0.25  # added to multiplier per trigger
MAX_WEIGHT_MULTIPLIER = 2.0


# ── Schemas ───────────────────────────────────────────────────────────────────

class SnoozePayload(BaseModel):
    user_id: int
    task_id: int        # the task being snoozed
    category: str       # task category (used for behavioral grouping)


class SnoozeResponse(BaseModel):
    user_id: int
    category: str
    snooze_count: int
    weight_multiplier: float
    penalty_applied: bool
    message: str


class WeightsResponse(BaseModel):
    user_id: int
    weights: list[dict]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/snooze", response_model=SnoozeResponse)
def record_snooze(body: SnoozePayload, db: Session = Depends(get_db)):
    """
    Record a snooze event and optionally escalate cognitive weight for the category.
    The system mathematically learns which task types the user avoids.
    """
    bw = (
        db.query(BehavioralWeight)
        .filter(BehavioralWeight.user_id == body.user_id, BehavioralWeight.category == body.category)
        .first()
    )

    if bw is None:
        bw = BehavioralWeight(
            user_id=body.user_id,
            category=body.category,
            snooze_count=0,
            weight_multiplier=1.0,
        )
        db.add(bw)

    bw.snooze_count += 1

    # Also increment the task's own snooze counter
    task = db.query(Task).filter(Task.id == body.task_id).first()
    if task:
        task.snooze_count += 1

    penalty_applied = False
    if bw.snooze_count >= SNOOZE_TRIGGER_COUNT and (bw.snooze_count % SNOOZE_TRIGGER_COUNT == 0):
        # Escalate weight multiplier every N snoozes
        bw.weight_multiplier = min(MAX_WEIGHT_MULTIPLIER, bw.weight_multiplier + WEIGHT_ESCALATION_STEP)
        penalty_applied = True

    db.commit()

    if penalty_applied:
        msg = (
            f"Avoidance pattern detected: {body.category} tasks snoozed {bw.snooze_count}× total. "
            f"Cognitive weight for '{body.category}' permanently scaled to ×{bw.weight_multiplier:.2f}."
        )
    else:
        remaining = SNOOZE_TRIGGER_COUNT - (bw.snooze_count % SNOOZE_TRIGGER_COUNT)
        msg = f"Snooze recorded. {remaining} more snooze(s) before '{body.category}' weight escalates."

    return SnoozeResponse(
        user_id=body.user_id,
        category=body.category,
        snooze_count=bw.snooze_count,
        weight_multiplier=bw.weight_multiplier,
        penalty_applied=penalty_applied,
        message=msg,
    )


@router.get("/weights", response_model=WeightsResponse)
def get_behavioral_weights(user_id: int, db: Session = Depends(get_db)):
    rows = db.query(BehavioralWeight).filter(BehavioralWeight.user_id == user_id).all()
    return WeightsResponse(
        user_id=user_id,
        weights=[
            {
                "category": r.category,
                "snooze_count": r.snooze_count,
                "weight_multiplier": r.weight_multiplier,
            }
            for r in rows
        ],
    )


@router.post("/reset")
def reset_category(user_id: int, category: str, db: Session = Depends(get_db)):
    bw = (
        db.query(BehavioralWeight)
        .filter(BehavioralWeight.user_id == user_id, BehavioralWeight.category == category)
        .first()
    )
    if not bw:
        raise HTTPException(status_code=404, detail=f"No behavioral record for category '{category}'.")
    bw.snooze_count = 0
    bw.weight_multiplier = 1.0
    db.commit()
    return {"user_id": user_id, "category": category, "reset": True}
