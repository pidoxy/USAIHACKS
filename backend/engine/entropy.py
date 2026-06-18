"""
Chrono-Kinetic Entropy (Sc) and Efficiency Decay η(t) calculator.

The LLM only translates raw documents into structured task JSON.
All scoring is deterministic math — no model inference here.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

StressLevel = Literal["low", "medium", "high"]

STRESS_WEIGHTS: dict[StressLevel, float] = {
    "low": 0.5,
    "medium": 1.0,
    "high": 1.8,
}


@dataclass
class Task:
    id: str
    title: str
    due_date: str
    hours_estimated: float
    stress_level: StressLevel
    completed_hours: float = 0.0


@dataclass
class EntropyState:
    Sc: int            # Chrono-Kinetic Entropy
    Rp: int            # Path Resilience (0–100 %)
    eta: float         # Efficiency η(t)  (0–1)
    deficit_debt: float  # hours behind


def calc_ck_entropy(tasks: list[Task], hours_of_sleep: float) -> int:
    """
    Sc = Σ(hours_i × weight_i) × (1 + sleep_penalty)
    sleep_penalty = max(0, (8 - sleep) × 0.3)
    """
    total_load = sum(t.hours_estimated * STRESS_WEIGHTS[t.stress_level] for t in tasks)
    sleep_penalty = max(0.0, (8.0 - hours_of_sleep) * 0.3)
    return round(total_load * (1 + sleep_penalty) * 100)


def calc_efficiency_decay(hours_worked: float, hours_of_sleep: float) -> float:
    """
    η(t) = e^(−λt)
    λ increases with sleep deprivation.
    """
    lam = 0.03 + max(0.0, (8.0 - hours_of_sleep) * 0.012)
    return round(max(0.1, math.exp(-lam * hours_worked)), 3)


def calc_path_resilience(Sc: int, max_Sc: int = 10_000) -> int:
    return max(0, round((1 - Sc / max_Sc) * 100))


def calc_deficit_debt(tasks: list[Task]) -> float:
    now = datetime.now(tz=timezone.utc)
    overdue = [t for t in tasks if datetime.fromisoformat(t.due_date).replace(tzinfo=timezone.utc) < now]
    return round(sum(t.hours_estimated - t.completed_hours for t in overdue), 1)


def compute_entropy_state(tasks: list[Task], hours_of_sleep: float = 7.0) -> EntropyState:
    Sc  = calc_ck_entropy(tasks, hours_of_sleep)
    Rp  = calc_path_resilience(Sc)
    eta = calc_efficiency_decay(
        hours_worked=sum(t.hours_estimated for t in tasks),
        hours_of_sleep=hours_of_sleep,
    )
    deficit_debt = calc_deficit_debt(tasks)
    return EntropyState(Sc=Sc, Rp=Rp, eta=eta, deficit_debt=deficit_debt)
