"""
/api/simulate — Monte Carlo Adversarial Crisis Simulator

POST /api/simulate/monte-carlo
  Accepts the human-validated task list from the frontend table.
  Runs 50 concurrent simulation threads over a 14-day rolling window.
  Returns Path Resilience (Rp), Chrono-Kinetic Entropy (Sc), and per-run breakdown.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User
from engine.entropy import Task as EngineTask
from engine.monte_carlo import run_monte_carlo, MonteCarloReport

router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────

class TaskIn(BaseModel):
    id: str
    title: str
    due_date: str                               # YYYY-MM-DD
    workload_hours: float = Field(ge=0.5)
    cognitive_weight: float = Field(default=1.0, ge=1.0, le=3.0)
    is_flexible: bool = True
    category: str = "General"
    completed_hours: float = 0.0


class SimulateRequest(BaseModel):
    tasks: list[TaskIn]
    user_id: int | None = None
    n_runs: int = Field(default=50, ge=10, le=200)
    hours_of_sleep: float = Field(default=7.0, ge=4.0, le=10.0)
    start_date: str | None = None               # defaults to today if omitted


class SimRunOut(BaseModel):
    run_id: int
    survived: bool
    peak_stress: float
    final_sc: float
    consecutive_stress_hours: int
    sick_day: int | None
    creep_applied: bool


class SimulateResponse(BaseModel):
    path_resilience: float      # Rp — the headline "survival rate"
    avg_sc: float               # average Chrono-Kinetic Entropy across all runs
    worst_sc: float
    best_sc: float
    survival_count: int
    total_runs: int
    # Human-readable UI translations
    ui_label_rp: str            # "There is only a 32% chance you survive…"
    ui_label_sc: str            # "Schedule Chaos" level
    runs: list[SimRunOut]


def _rp_label(rp: float) -> str:
    if rp >= 80:
        return f"Strong schedule — {rp:.0f}% of simulated timelines end without a missed deadline."
    if rp >= 50:
        return f"Risky schedule — only {rp:.0f}% of simulated timelines survive. Consider the Arbitrage solver."
    return f"Critical — there is only a {rp:.0f}% chance you survive this schedule without burning out or missing deadlines."


def _sc_label(sc: float) -> str:
    if sc < 5:
        return "Low context-switching tax. Your tasks are well grouped."
    if sc < 10:
        return "Moderate Schedule Chaos. You are jumping between too many task types — try grouping similar work."
    return "High Schedule Chaos. You are switching between coding, writing, and other work too fast. Run Arbitrage to reduce mental friction."


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/monte-carlo", response_model=SimulateResponse)
def monte_carlo(body: SimulateRequest, db: Session = Depends(get_db)):
    if not body.tasks:
        raise HTTPException(status_code=400, detail="No tasks provided.")

    # Fetch user's η₀ multiplier if user_id provided
    eta_0 = 1.0
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
        if user:
            eta_0 = user.eta_0

    # Apply behavioral weight multipliers from DB
    from models import BehavioralWeight
    bw_map: dict[str, float] = {}
    if body.user_id:
        bw_rows = db.query(BehavioralWeight).filter(BehavioralWeight.user_id == body.user_id).all()
        bw_map = {row.category: row.weight_multiplier for row in bw_rows}

    engine_tasks = [
        EngineTask(
            id=t.id,
            title=t.title,
            due_date=t.due_date,
            workload_hours=t.workload_hours,
            cognitive_weight=t.cognitive_weight,
            is_flexible=t.is_flexible,
            category=t.category,
            completed_hours=t.completed_hours,
            weight_multiplier=bw_map.get(t.category, 1.0),
        )
        for t in body.tasks
    ]

    start = None
    if body.start_date:
        try:
            start = date.fromisoformat(body.start_date)
        except ValueError:
            pass

    report: MonteCarloReport = run_monte_carlo(
        tasks=engine_tasks,
        n_runs=body.n_runs,
        eta_0=eta_0,
        start_date=start,
    )

    return SimulateResponse(
        path_resilience=report.path_resilience,
        avg_sc=report.avg_sc,
        worst_sc=report.worst_sc,
        best_sc=report.best_sc,
        survival_count=report.survival_count,
        total_runs=report.total_runs,
        ui_label_rp=_rp_label(report.path_resilience),
        ui_label_sc=_sc_label(report.avg_sc),
        runs=[
            SimRunOut(
                run_id=r.run_id,
                survived=r.survived,
                peak_stress=r.peak_stress,
                final_sc=r.final_sc,
                consecutive_stress_hours=r.consecutive_stress_hours,
                sick_day=r.sick_day,
                creep_applied=r.creep_applied,
            )
            for r in report.runs
        ],
    )
