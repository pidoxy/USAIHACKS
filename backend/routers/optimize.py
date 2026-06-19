"""
/api/optimize — MILP Arbitrage Schedule Solver

POST /api/optimize/arbitrage
  Accepts the validated task list + fixed calendar events.
  Runs the PuLP MILP solver to minimize Chrono-Kinetic Entropy.
  Returns optimized schedule blocks + caches as Scenario B.

POST /api/optimize/commit
  Promotes Scenario B from the cache — triggers Google Calendar write-back.
"""

import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User, ScenarioCache
from engine.milp_solver import Task as EngineTask, FixedEvent, solve_milp, SolverResult, ScheduledBlock

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TaskIn(BaseModel):
    id: str
    title: str
    due_date: str
    workload_hours: float = Field(ge=0.5)
    cognitive_weight: float = Field(default=1.0, ge=1.0, le=3.0)
    is_flexible: bool = True
    category: str = "General"
    weight_multiplier: float = Field(default=1.0, ge=1.0)


class FixedEventIn(BaseModel):
    id: str
    title: str
    start_dt: str
    end_dt: str


class ArbitrageRequest(BaseModel):
    tasks: list[TaskIn]
    fixed_events: list[FixedEventIn] = []
    user_id: int | None = None
    start_date: str | None = None
    n_days: int = Field(default=14, ge=1, le=30)


class ScheduledBlockOut(BaseModel):
    task_id: str
    title: str
    date: str
    start_hour: float
    end_hour: float
    cognitive_weight: float
    load_pct: float
    # UI colour: "green" | "orange" | "red"
    heat_color: str


class ArbitrageResponse(BaseModel):
    status: str
    scheduled: list[ScheduledBlockOut]
    unscheduled_ids: list[str]
    final_sc: float
    sleep_guarantee_hours: float
    total_days: int
    scenario_cache_id: int | None = None


class CommitRequest(BaseModel):
    user_id: int
    scenario_cache_id: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _heat_color(load_pct: float) -> str:
    if load_pct <= 30:
        return "green"
    if load_pct <= 70:
        return "orange"
    return "red"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/arbitrage", response_model=ArbitrageResponse)
def arbitrage(body: ArbitrageRequest, db: Session = Depends(get_db)):
    if not body.tasks:
        raise HTTPException(status_code=400, detail="No tasks provided.")

    # Pull circadian preference from user profile
    circadian_type = "morning"
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
        if user:
            circadian_type = user.circadian_type

        # Apply behavioral weight multipliers
        from models import BehavioralWeight
        bw_rows = db.query(BehavioralWeight).filter(BehavioralWeight.user_id == body.user_id).all()
        bw_map = {row.category: row.weight_multiplier for row in bw_rows}
        for task in body.tasks:
            if task.category in bw_map:
                task.weight_multiplier = max(task.weight_multiplier, bw_map[task.category])

    start = date.today()
    if body.start_date:
        try:
            start = date.fromisoformat(body.start_date)
        except ValueError:
            pass

    engine_tasks = [
        EngineTask(
            id=t.id,
            title=t.title,
            due_date=t.due_date,
            workload_hours=t.workload_hours,
            cognitive_weight=t.cognitive_weight,
            is_flexible=t.is_flexible,
            category=t.category,
            weight_multiplier=t.weight_multiplier,
        )
        for t in body.tasks
    ]

    fixed = [FixedEvent(id=e.id, title=e.title, start_dt=e.start_dt, end_dt=e.end_dt)
             for e in body.fixed_events]

    result: SolverResult = solve_milp(
        tasks=engine_tasks,
        fixed_events=fixed,
        start_date=start,
        circadian_type=circadian_type,
        n_days=body.n_days,
    )

    blocks_out = [
        ScheduledBlockOut(
            task_id=b.task_id,
            title=b.title,
            date=b.date,
            start_hour=b.start_hour,
            end_hour=b.end_hour,
            cognitive_weight=b.cognitive_weight,
            load_pct=b.load_pct,
            heat_color=_heat_color(b.load_pct),
        )
        for b in result.scheduled
    ]

    # Cache as Scenario B so user can review before committing to Google Calendar
    cache_id = None
    if body.user_id:
        cache = ScenarioCache(
            user_id=body.user_id,
            scenario_type="B",
            tasks_json=json.dumps([b.model_dump() for b in blocks_out]),
            simulation_sc=result.final_sc,
        )
        db.add(cache)
        db.commit()
        db.refresh(cache)
        cache_id = cache.id

    return ArbitrageResponse(
        status=result.status,
        scheduled=blocks_out,
        unscheduled_ids=result.unscheduled_ids,
        final_sc=result.final_sc,
        sleep_guarantee_hours=result.sleep_guarantee_hours,
        total_days=result.total_days,
        scenario_cache_id=cache_id,
    )


@router.post("/commit")
def commit_scenario(body: CommitRequest, db: Session = Depends(get_db)):
    """
    Promote Scenario B to live calendar.
    Delegates actual Calendar API calls to /api/calendar/write.
    """
    cache = db.query(ScenarioCache).filter(
        ScenarioCache.id == body.scenario_cache_id,
        ScenarioCache.user_id == body.user_id,
        ScenarioCache.scenario_type == "B",
    ).first()

    if not cache:
        raise HTTPException(status_code=404, detail="Scenario B not found — run /api/optimize/arbitrage first.")

    blocks = json.loads(cache.tasks_json)
    return {"status": "ready_to_commit", "blocks": blocks, "scenario_cache_id": cache.id}
