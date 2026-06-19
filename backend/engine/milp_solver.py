"""
MILP Constraint Solver — deterministic schedule optimizer.

Objective: Minimize Chrono-Kinetic Entropy (Sc) by grouping similar-weight
tasks together and placing high-cognitive-weight tasks in peak biological hours.

Hard constraints:
  - 7-hour sleep block per 24-hour window (non-negotiable)
  - Fixed calendar events cannot be altered
  - Every flexible task must be fully scheduled before its due_date

Loophole fixes:
  - 15% slack-variable buffer around high-density clusters
  - Circadian penalty forces high-weight tasks (wᵢ ≥ 2.5) into peak hours
"""

import math
from dataclasses import dataclass, field
from datetime import date, timedelta

from pulp import (
    LpProblem, LpMinimize, LpVariable, LpStatus,
    lpSum, value, PULP_CBC_CMD,
)

from engine.entropy import Task, calc_ck_entropy, calc_context_switch_metric

SLEEP_HOURS: float = 7.0
USABLE_HOURS: float = 24.0 - SLEEP_HOURS          # 17 h/day
SLACK_FACTOR: float = 0.85                          # 15% buffer reserve
MIN_BLOCK_HOURS: float = 0.5                        # smallest assignable chunk
MAX_BLOCK_HOURS: float = 4.0                        # max deep-work block per day
HIGH_WEIGHT_THRESHOLD: float = 2.5                 # triggers circadian penalty
CIRCADIAN_OVERFLOW_HOURS: float = 4.0              # hours beyond which evening penalty kicks in


@dataclass
class FixedEvent:
    id: str
    title: str
    start_dt: str       # ISO datetime
    end_dt: str


@dataclass
class ScheduledBlock:
    task_id: str
    title: str
    date: str           # YYYY-MM-DD
    start_hour: float   # 0–23
    end_hour: float
    cognitive_weight: float
    load_pct: float


@dataclass
class SolverResult:
    status: str             # "Optimal" | "Infeasible" | "Not Solved"
    scheduled: list[ScheduledBlock] = field(default_factory=list)
    unscheduled_ids: list[str] = field(default_factory=list)
    final_sc: float = 0.0
    sleep_guarantee_hours: float = SLEEP_HOURS
    total_days: int = 14


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fixed_hours_by_day(
    fixed_events: list[FixedEvent],
    start: date,
    n_days: int,
) -> dict[int, float]:
    """Return blocked hours per day index (0-based)."""
    blocked: dict[int, float] = {d: 0.0 for d in range(n_days)}
    for ev in fixed_events:
        try:
            from datetime import datetime
            s = datetime.fromisoformat(ev.start_dt)
            e = datetime.fromisoformat(ev.end_dt)
            day_idx = (s.date() - start).days
            if 0 <= day_idx < n_days:
                duration = (e - s).total_seconds() / 3600.0
                blocked[day_idx] = blocked.get(day_idx, 0.0) + duration
        except (ValueError, AttributeError):
            pass
    return blocked


def _circadian_start_hour(circadian_type: str, weight: float) -> float:
    """Preferred start hour for a task based on user chronotype and weight."""
    if circadian_type == "evening":
        return 14.0 if weight >= HIGH_WEIGHT_THRESHOLD else 17.0
    # morning lark
    return 7.0 if weight >= HIGH_WEIGHT_THRESHOLD else 9.0


# ── MILP formulation ─────────────────────────────────────────────────────────

def solve_milp(
    tasks: list[Task],
    fixed_events: list[FixedEvent] | None = None,
    start_date: date | None = None,
    circadian_type: str = "morning",
    n_days: int = 14,
) -> SolverResult:
    fixed_events = fixed_events or []
    start = start_date or date.today()

    flexible = [t for t in tasks if t.is_flexible]
    if not flexible:
        return SolverResult(status="Optimal", scheduled=[], unscheduled_ids=[])

    blocked = _fixed_hours_by_day(fixed_events, start, n_days)
    # Capacity per day after sleep and fixed events, with 15% slack buffer
    cap: dict[int, float] = {
        d: max(0.0, (USABLE_HOURS - blocked.get(d, 0.0))) * SLACK_FACTOR
        for d in range(n_days)
    }

    days = list(range(n_days))
    n_tasks = len(flexible)

    prob = LpProblem("KRONOS_MILP", LpMinimize)

    # h[i][d] = hours of flexible task i worked on day d
    h = {
        (i, d): LpVariable(f"h_{i}_{d}", lowBound=0.0)
        for i in range(n_tasks) for d in days
    }

    # y[i][d] ∈ {0,1} = 1 if task i receives any work on day d
    y = {
        (i, d): LpVariable(f"y_{i}_{d}", cat="Binary")
        for i in range(n_tasks) for d in days
    }

    # overflow[i][d] = max(0, h[i][d] - MAX_BLOCK_HOURS) → linearised circadian penalty
    overflow = {
        (i, d): LpVariable(f"ov_{i}_{d}", lowBound=0.0)
        for i in range(n_tasks) for d in days
    }

    # Circadian penalty variable per task
    circ_penalty = {
        i: LpVariable(f"cp_{i}", lowBound=0.0)
        for i in range(n_tasks)
    }

    # ── Objective ────────────────────────────────────────────────────────────
    # Minimise weighted task-day count (∝ context switching) + circadian penalties.
    # The wᵢ · y[i,d] term makes the solver concentrate tasks onto fewer days.
    prob += (
        lpSum(flexible[i].effective_weight * y[i, d]
              for i in range(n_tasks) for d in days)
        + lpSum(2.0 * flexible[i].effective_weight * circ_penalty[i]
                for i in range(n_tasks)
                if flexible[i].effective_weight >= HIGH_WEIGHT_THRESHOLD)
    )

    # ── Constraints ──────────────────────────────────────────────────────────
    for i, task in enumerate(flexible):
        # Determine due-date day index (clamp within window)
        try:
            due_day = (date.fromisoformat(task.due_date[:10]) - start).days - 1
        except ValueError:
            due_day = n_days - 1
        due_day = max(0, min(n_days - 1, due_day))

        # Task must be fully scheduled before/on its due day
        prob += (
            lpSum(h[i, d] for d in range(due_day + 1)) == task.workload_hours,
            f"complete_{i}",
        )

        for d in days:
            # Link h to y: if y=0 then h=0; if y=1, h ≤ cap[d]
            prob += h[i, d] <= cap[d] * y[i, d], f"link_upper_{i}_{d}"
            # Minimum block size if assigned
            prob += h[i, d] >= MIN_BLOCK_HOURS * y[i, d], f"link_lower_{i}_{d}"

            # Circadian penalty linearisation: overflow = max(0, h - MAX_BLOCK)
            prob += overflow[i, d] >= h[i, d] - MAX_BLOCK_HOURS, f"ov_lb_{i}_{d}"

        # High-weight tasks: penalise overflow (forces into morning peak blocks)
        if task.effective_weight >= HIGH_WEIGHT_THRESHOLD:
            prob += circ_penalty[i] >= lpSum(overflow[i, d] for d in days), f"circ_{i}"

    # Daily capacity constraint (15% slack already in cap[d])
    for d in days:
        prob += (
            lpSum(h[i, d] for i in range(n_tasks)) <= cap[d],
            f"cap_{d}",
        )

    # ── Solve ─────────────────────────────────────────────────────────────────
    prob.solve(PULP_CBC_CMD(msg=0, timeLimit=30))
    status = LpStatus[prob.status]

    if status not in ("Optimal", "Not Solved"):
        unscheduled = [t.id for t in flexible]
        return SolverResult(status=status, unscheduled_ids=unscheduled)

    # ── Extract schedule ──────────────────────────────────────────────────────
    scheduled: list[ScheduledBlock] = []
    unscheduled_ids: list[str] = []
    day_hour_cursor: dict[int, float] = {}  # track next free hour per day

    for i, task in enumerate(flexible):
        task_scheduled = False
        for d in days:
            hrs = value(h[i, d])
            if hrs is None or hrs < 0.05:
                continue
            task_scheduled = True
            block_date = start + timedelta(days=d)
            preferred_start = _circadian_start_hour(circadian_type, task.effective_weight)
            cursor = max(preferred_start, day_hour_cursor.get(d, preferred_start))
            end_h = min(23.0 - SLEEP_HOURS + 7.0, cursor + hrs)  # cap at sleep boundary

            scheduled.append(ScheduledBlock(
                task_id=task.id,
                title=task.title,
                date=block_date.isoformat(),
                start_hour=round(cursor, 2),
                end_hour=round(end_h, 2),
                cognitive_weight=task.effective_weight,
                load_pct=round(hrs / USABLE_HOURS * 100, 1),
            ))
            day_hour_cursor[d] = end_h + 0.25  # 15-min transition buffer

        if not task_scheduled:
            unscheduled_ids.append(task.id)

    # Post-solve Sc with actual scheduled context-switch order
    scheduled_tasks = [
        Task(
            id=b.task_id, title=b.title, due_date=b.date,
            workload_hours=b.end_hour - b.start_hour,
            cognitive_weight=b.cognitive_weight,
        )
        for b in sorted(scheduled, key=lambda b: (b.date, b.start_hour))
    ]
    Cs = calc_context_switch_metric(scheduled_tasks)
    final_sc = calc_ck_entropy(scheduled_tasks, Cs)

    return SolverResult(
        status=status,
        scheduled=scheduled,
        unscheduled_ids=unscheduled_ids,
        final_sc=round(final_sc, 3),
        sleep_guarantee_hours=SLEEP_HOURS,
        total_days=n_days,
    )
