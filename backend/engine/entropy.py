"""
Chrono-Kinetic Entropy (Sc), Bounded-Rationality Efficiency Decay η(t),
and Path Resilience Rating (Rp) — exact PRD formulas, zero LLM calls.
"""

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


CognitiveWeightLevel = Literal["low", "medium", "high"]

# Maps human-readable labels to numeric cognitive_weight for legacy compatibility
WEIGHT_MAP: dict[str, float] = {"low": 1.0, "medium": 2.0, "high": 3.0}


@dataclass
class Task:
    id: str
    title: str
    due_date: str               # ISO date or datetime string
    workload_hours: float
    cognitive_weight: float     # 1.0 (light) → 3.0 (exhausting)
    is_flexible: bool = True
    category: str = "General"
    completed_hours: float = 0.0
    # Applied by behavioral-avoidance engine when user snoozes ≥3×
    weight_multiplier: float = 1.0

    @property
    def effective_weight(self) -> float:
        return min(3.0, self.cognitive_weight * self.weight_multiplier)


@dataclass
class EntropyState:
    Sc: float           # Chrono-Kinetic Entropy
    Rp: float           # Path Resilience 0–100 %
    eta: float          # Efficiency η(t)  0–1
    deficit_debt: float # Hours of overdue work not yet completed


# ── Core PRD equations ──────────────────────────────────────────────────────

def calc_context_switch_metric(tasks: list[Task]) -> float:
    """
    Cs = number of category transitions / max possible transitions.
    Higher Cs = more mental friction from context switching.
    """
    if len(tasks) <= 1:
        return 0.0
    transitions = sum(
        1 for a, b in zip(tasks, tasks[1:]) if a.category != b.category
    )
    return transitions / (len(tasks) - 1)


def calc_ck_entropy(tasks: list[Task], Cs: float | None = None) -> float:
    """
    PRD equation: Sc = Σ wᵢ · ln(dᵢ) · (1 + Cs)
    wᵢ = effective cognitive weight, dᵢ = workload_hours
    """
    if Cs is None:
        Cs = calc_context_switch_metric(tasks)
    if not tasks:
        return 0.0
    raw = sum(
        t.effective_weight * math.log(max(1.0, t.workload_hours))
        for t in tasks
    )
    return raw * (1.0 + Cs)


def calc_efficiency_decay(
    t: float,
    eta_0: float = 1.0,
    lam: float = 0.03,
    t_x: float = 8.0,
) -> float:
    """
    PRD equation: η(t) = η₀ · e^(−λ(t − tₓ))
    t   = consecutive hours worked since last rest
    t_x = cross-over threshold (start of performance decay, default 8h)
    """
    decay = eta_0 * math.exp(-lam * max(0.0, t - t_x))
    return round(max(0.05, min(1.0, decay)), 4)


def calc_path_resilience(survival_successes: int, total_runs: int) -> float:
    """
    PRD equation: Rp = (Σ Xₘ / M) × 100
    Xₘ = 1 if run m survived, 0 otherwise
    """
    if total_runs == 0:
        return 0.0
    return round((survival_successes / total_runs) * 100.0, 1)


def calc_deficit_debt(tasks: list[Task]) -> float:
    now = datetime.now(tz=timezone.utc)
    total = 0.0
    for t in tasks:
        try:
            due = datetime.fromisoformat(t.due_date)
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if due < now:
                total += max(0.0, t.workload_hours - t.completed_hours)
        except ValueError:
            pass
    return round(total, 2)


def compute_entropy_state(
    tasks: list[Task],
    eta_0: float = 1.0,
    hours_worked_today: float = 0.0,
) -> EntropyState:
    Cs = calc_context_switch_metric(tasks)
    Sc = calc_ck_entropy(tasks, Cs)
    Rp = max(0.0, 100.0 - Sc * 5.0)   # heuristic mapping until MC overrides
    eta = calc_efficiency_decay(t=hours_worked_today, eta_0=eta_0)
    deficit_debt = calc_deficit_debt(tasks)
    return EntropyState(Sc=round(Sc, 3), Rp=round(Rp, 1), eta=eta, deficit_debt=deficit_debt)
