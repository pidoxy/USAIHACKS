"""
Adversarial Simulation Ring — 50 concurrent Monte Carlo threads, 14-day rolling window.

PRD stochastic events:
  P(S) = 0.05  → Sickness: η(t) drops 50% for 48 simulation-hours
  P(C) = 0.15  → Task Creep: workload_hours × 1.3 for affected tasks

A run is registered as a failure when cumulative cognitive stress exceeds the
HIGH_STRESS_THRESHOLD for more than 48 consecutive simulated hours.
"""

import math
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import date, timedelta

from engine.entropy import Task, calc_ck_entropy, calc_context_switch_metric, calc_efficiency_decay

SICKNESS_PROB: float = 0.05
TASK_CREEP_PROB: float = 0.15
SICKNESS_EFFICIENCY_PENALTY: float = 0.5   # η drops to 50%
TASK_CREEP_MULTIPLIER: float = 1.3
HIGH_STRESS_THRESHOLD: float = 2.8         # effective cognitive load/hour
FAILURE_CONSECUTIVE_HOURS: int = 48        # fail if exceeded this long
SIMULATION_DAYS: int = 14
USABLE_HOURS_PER_DAY: float = 17.0         # 24h - 7h sleep
N_SIMULATION_THREADS: int = 50


@dataclass
class SimRun:
    run_id: int
    survived: bool
    peak_stress: float
    final_sc: float
    consecutive_stress_hours: int
    sick_day: int | None       # day the sickness event hit (-1 if none)
    creep_applied: bool


@dataclass
class MonteCarloReport:
    path_resilience: float      # Rp = success_count/50 × 100
    avg_sc: float
    worst_sc: float
    best_sc: float
    survival_count: int
    total_runs: int
    runs: list[SimRun] = field(default_factory=list)

    @property
    def survival_rate(self) -> float:
        return self.path_resilience


# ── Per-run simulation ───────────────────────────────────────────────────────

def _run_single_simulation(
    tasks: list[Task],
    run_id: int,
    eta_0: float = 1.0,
    start_date: date | None = None,
) -> SimRun:
    rng = random.Random(run_id * 31337 + id(tasks))

    today = start_date or date.today()
    window_end = today + timedelta(days=SIMULATION_DAYS)

    # Filter to 14-day rolling window only
    window_tasks: list[Task] = []
    for t in tasks:
        try:
            due = date.fromisoformat(t.due_date[:10])
            if today <= due <= window_end:
                window_tasks.append(t)
        except ValueError:
            window_tasks.append(t)

    if not window_tasks:
        return SimRun(
            run_id=run_id, survived=True, peak_stress=0.0, final_sc=0.0,
            consecutive_stress_hours=0, sick_day=None, creep_applied=False,
        )

    # ── Apply adversarial events ────────────────────────────────────────────
    sick_day: int | None = None
    if rng.random() < SICKNESS_PROB:
        sick_day = rng.randint(0, SIMULATION_DAYS - 2)

    creep_applied = False
    sim_tasks: list[Task] = []
    for t in window_tasks:
        new_hours = t.workload_hours
        if rng.random() < TASK_CREEP_PROB:
            new_hours *= TASK_CREEP_MULTIPLIER
            creep_applied = True
        sim_tasks.append(Task(
            id=t.id, title=t.title, due_date=t.due_date,
            workload_hours=new_hours, cognitive_weight=t.cognitive_weight,
            is_flexible=t.is_flexible, category=t.category,
            completed_hours=t.completed_hours,
            weight_multiplier=t.weight_multiplier,
        ))

    total_workload = sum(t.workload_hours for t in sim_tasks)
    Cs = calc_context_switch_metric(sim_tasks)

    # ── Hour-by-hour simulation over 14 days ───────────────────────────────
    consecutive_high = 0
    max_consecutive = 0
    peak_stress = 0.0
    cumulative_hours_worked = 0.0
    remaining_load = total_workload

    for day in range(SIMULATION_DAYS):
        # Efficiency for today
        daily_eta = calc_efficiency_decay(t=cumulative_hours_worked, eta_0=eta_0)
        if sick_day is not None and day in (sick_day, sick_day + 1):
            daily_eta *= SICKNESS_EFFICIENCY_PENALTY
        daily_eta = max(0.05, daily_eta)

        # Hours actually workable today
        hours_today = min(remaining_load, USABLE_HOURS_PER_DAY)
        if hours_today <= 0:
            consecutive_high = 0
            continue

        # Average cognitive weight for tasks due within this day
        avg_weight = sum(t.effective_weight for t in sim_tasks) / len(sim_tasks)

        # Stress = cognitive load adjusted for efficiency
        stress_per_hour = avg_weight * (hours_today / USABLE_HOURS_PER_DAY) / daily_eta
        peak_stress = max(peak_stress, stress_per_hour)

        stress_hours_today = USABLE_HOURS_PER_DAY if stress_per_hour > HIGH_STRESS_THRESHOLD else 0

        if stress_hours_today > 0:
            consecutive_high += int(USABLE_HOURS_PER_DAY)
        else:
            consecutive_high = 0

        max_consecutive = max(max_consecutive, consecutive_high)
        cumulative_hours_worked += hours_today
        remaining_load -= hours_today

    # ── Final Sc for this run ──────────────────────────────────────────────
    final_sc = calc_ck_entropy(sim_tasks, Cs)

    survived = max_consecutive <= FAILURE_CONSECUTIVE_HOURS

    return SimRun(
        run_id=run_id,
        survived=survived,
        peak_stress=round(peak_stress, 3),
        final_sc=round(final_sc, 3),
        consecutive_stress_hours=max_consecutive,
        sick_day=sick_day,
        creep_applied=creep_applied,
    )


# ── Public entry point ───────────────────────────────────────────────────────

def run_monte_carlo(
    tasks: list[Task],
    n_runs: int = N_SIMULATION_THREADS,
    eta_0: float = 1.0,
    start_date: date | None = None,
) -> MonteCarloReport:
    results: list[SimRun] = []

    with ThreadPoolExecutor(max_workers=n_runs) as executor:
        futures = {
            executor.submit(_run_single_simulation, tasks, i, eta_0, start_date): i
            for i in range(n_runs)
        }
        for future in as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda r: r.run_id)

    survived = sum(1 for r in results if r.survived)
    path_resilience = round((survived / n_runs) * 100.0, 1)
    sc_values = [r.final_sc for r in results]

    return MonteCarloReport(
        path_resilience=path_resilience,
        avg_sc=round(sum(sc_values) / len(sc_values), 3),
        worst_sc=round(max(sc_values), 3),
        best_sc=round(min(sc_values), 3),
        survival_count=survived,
        total_runs=n_runs,
        runs=results,
    )
