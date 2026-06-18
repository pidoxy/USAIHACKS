"""
Monte Carlo adversarial crisis simulator.

Runs N parallel 'virtual semesters', throwing randomised crises at the
user's schedule to compute a hard survival probability (Rp ≥ 30 %).
"""

import random
from dataclasses import dataclass, field

from engine.entropy import Task, EntropyState, compute_entropy_state

CRISIS_POOL: list[dict] = [
    {"name": "Unexpected illness",   "duration_hours": 48, "intensity": 7},
    {"name": "System outage",        "duration_hours": 12, "intensity": 9},
    {"name": "Family emergency",     "duration_hours": 24, "intensity": 8},
    {"name": "Exam rescheduled",     "duration_hours": 0,  "intensity": 5},
    {"name": "Internet outage",      "duration_hours": 6,  "intensity": 4},
    {"name": "Sleep deprivation",    "duration_hours": 0,  "intensity": 6},
]


@dataclass
class Crisis:
    name: str
    duration_hours: float
    intensity: int


@dataclass
class SimRun:
    run_id: int
    survived: bool
    peak_entropy: int
    final_rp: int


@dataclass
class MonteCarloReport:
    survival_rate: int
    avg_peak_entropy: int
    worst_case_rp: int
    best_case_rp: int
    runs: list[SimRun] = field(default_factory=list)


def _random_crisis() -> Crisis:
    c = random.choice(CRISIS_POOL)
    return Crisis(**c)


def run_monte_carlo(
    base_tasks: list[Task],
    n_runs: int = 50,
    extra_crises: list[Crisis] | None = None,
) -> MonteCarloReport:
    results: list[SimRun] = []

    for i in range(n_runs):
        crises = extra_crises if extra_crises else [_random_crisis()]
        extra_load = sum((c.duration_hours * c.intensity) / 10 for c in crises)

        augmented: list[Task] = [
            *base_tasks,
            *[
                Task(
                    id=f"crisis-{i}-{j}",
                    title=c.name,
                    due_date="2026-12-31T00:00:00",
                    hours_estimated=max(1.0, c.duration_hours),
                    stress_level="high" if c.intensity >= 7 else "medium" if c.intensity >= 4 else "low",
                )
                for j, c in enumerate(crises)
            ],
        ]

        sleep_hours = max(3.0, 7.0 - extra_load * 0.1 + (random.random() - 0.5) * 2)
        state: EntropyState = compute_entropy_state(augmented, sleep_hours)

        results.append(SimRun(
            run_id=i,
            survived=state.Rp >= 30,
            peak_entropy=state.Sc,
            final_rp=state.Rp,
        ))

    survived = sum(1 for r in results if r.survived)
    return MonteCarloReport(
        survival_rate=round((survived / n_runs) * 100),
        avg_peak_entropy=round(sum(r.peak_entropy for r in results) / n_runs),
        worst_case_rp=min(r.final_rp for r in results),
        best_case_rp=max(r.final_rp for r in results),
        runs=results,
    )
