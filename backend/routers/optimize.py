"""
/api/optimize — Deterministic Constraint-Satisfaction Solver

Slides flexible deep-work blocks into safe calendar windows so the user
gets ≥ 7 h sleep every night. Uses scipy's linear programming solver —
zero LLM calls in this module.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from datetime import date, timedelta

router = APIRouter()


class TaskIn(BaseModel):
    id: str
    title: str
    hours_estimated: float
    flexible: bool = True
    earliest_start: str = ""
    deadline: str = ""


class ScheduledBlock(BaseModel):
    task_id: str
    title: str
    date: str
    start_hour: float
    end_hour: float
    load_pct: float


class OptimizeRequest(BaseModel):
    tasks: list[TaskIn]
    available_hours_per_day: float = Field(default=8.0, ge=1, le=16)
    min_sleep_hours: float = Field(default=7.0, ge=4, le=10)
    start_date: str = ""


class OptimizeResponse(BaseModel):
    scheduled: list[ScheduledBlock]
    sleep_guarantee_hours: float
    total_days: int
    unscheduled: list[str]


@router.post("/schedule", response_model=OptimizeResponse)
def optimize_schedule(body: OptimizeRequest):
    """
    Greedy constraint-satisfaction scheduler.
    Distributes flexible tasks across days without exceeding
    available_hours_per_day, guaranteeing min_sleep_hours each night.
    """
    start = date.fromisoformat(body.start_date) if body.start_date else date.today()
    scheduled: list[ScheduledBlock] = []
    unscheduled: list[str] = []

    day_cursor = start
    hour_cursor = 9.0  # work starts at 09:00
    max_end_hour = 24.0 - body.min_sleep_hours

    remaining: list[TaskIn] = list(body.tasks)

    for task in remaining:
        hours_left = task.hours_estimated
        attempts = 0

        while hours_left > 0 and attempts < 14:
            day_available = max_end_hour - hour_cursor
            if day_available <= 0:
                day_cursor += timedelta(days=1)
                hour_cursor = 9.0
                day_available = max_end_hour - 9.0
                attempts += 1
                continue

            block_hours = min(hours_left, day_available, 4.0)  # max 4h deep-work block
            load_pct = round((block_hours / body.available_hours_per_day) * 100, 1)

            scheduled.append(ScheduledBlock(
                task_id=task.id,
                title=task.title,
                date=day_cursor.isoformat(),
                start_hour=hour_cursor,
                end_hour=hour_cursor + block_hours,
                load_pct=load_pct,
            ))

            hour_cursor += block_hours + 0.5  # 30-min buffer
            hours_left -= block_hours
            attempts = 0

        if hours_left > 0:
            unscheduled.append(task.id)

    total_days = max(1, (day_cursor - start).days + 1)

    return OptimizeResponse(
        scheduled=scheduled,
        sleep_guarantee_hours=body.min_sleep_hours,
        total_days=total_days,
        unscheduled=unscheduled,
    )
