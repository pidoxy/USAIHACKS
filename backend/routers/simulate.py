"""
/api/simulate — Monte Carlo Adversarial Crisis Simulator

Runs N parallel virtual semesters with randomised crises injected,
returning a hard survival probability and per-run breakdown.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from engine.entropy import Task as EngineTask
from engine.monte_carlo import Crisis, run_monte_carlo, MonteCarloReport

router = APIRouter()


class TaskIn(BaseModel):
    id: str
    title: str
    due_date: str
    hours_estimated: float
    stress_level: str
    completed_hours: float = 0.0


class CrisisIn(BaseModel):
    name: str
    duration_hours: float
    intensity: int = Field(ge=1, le=10)


class SimulateRequest(BaseModel):
    tasks: list[TaskIn]
    extra_crises: list[CrisisIn] = []
    n_runs: int = Field(default=50, ge=10, le=200)
    hours_of_sleep: float = Field(default=7.0, ge=0, le=12)


class SimRunOut(BaseModel):
    run_id: int
    survived: bool
    peak_entropy: int
    final_rp: int


class SimulateResponse(BaseModel):
    survival_rate: int
    avg_peak_entropy: int
    worst_case_rp: int
    best_case_rp: int
    runs: list[SimRunOut]


@router.post("/monte-carlo", response_model=SimulateResponse)
def monte_carlo(body: SimulateRequest):
    tasks = [
        EngineTask(
            id=t.id,
            title=t.title,
            due_date=t.due_date,
            hours_estimated=t.hours_estimated,
            stress_level=t.stress_level,  # type: ignore[arg-type]
            completed_hours=t.completed_hours,
        )
        for t in body.tasks
    ]
    crises = [Crisis(name=c.name, duration_hours=c.duration_hours, intensity=c.intensity) for c in body.extra_crises]

    report: MonteCarloReport = run_monte_carlo(tasks, n_runs=body.n_runs, extra_crises=crises or None)

    return SimulateResponse(
        survival_rate=report.survival_rate,
        avg_peak_entropy=report.avg_peak_entropy,
        worst_case_rp=report.worst_case_rp,
        best_case_rp=report.best_case_rp,
        runs=[SimRunOut(run_id=r.run_id, survived=r.survived, peak_entropy=r.peak_entropy, final_rp=r.final_rp) for r in report.runs],
    )
