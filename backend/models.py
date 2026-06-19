from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    google_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String, default="")
    # Bounded-rationality efficiency baseline — updated by velocity tracker
    eta_0: Mapped[float] = mapped_column(Float, default=1.0)
    # "morning" | "evening"
    circadian_type: Mapped[str] = mapped_column(String, default="morning")
    access_token: Mapped[str] = mapped_column(Text, default="")
    refresh_token: Mapped[str] = mapped_column(Text, default="")
    token_expiry: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    behavioral_weights: Mapped[list["BehavioralWeight"]] = relationship("BehavioralWeight", back_populates="user", cascade="all, delete-orphan")
    velocity_records: Mapped[list["VelocityRecord"]] = relationship("VelocityRecord", back_populates="user", cascade="all, delete-orphan")
    calendar_events: Mapped[list["CalendarEvent"]] = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")
    scenario_caches: Mapped[list["ScenarioCache"]] = relationship("ScenarioCache", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String)
    due_date: Mapped[str] = mapped_column(String)   # ISO date string YYYY-MM-DD
    workload_hours: Mapped[float] = mapped_column(Float)
    cognitive_weight: Mapped[float] = mapped_column(Float, default=1.0)  # 1.0–3.0
    is_flexible: Mapped[bool] = mapped_column(Boolean, default=True)
    # e.g. "Math", "Writing", "Coding" — used for behavioral avoidance detection
    category: Mapped[str] = mapped_column(String, default="General")
    snooze_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_hours: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="tasks")


class BehavioralWeight(Base):
    """Tracks snooze-driven cognitive weight inflation per task category."""
    __tablename__ = "behavioral_weights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String)
    snooze_count: Mapped[int] = mapped_column(Integer, default=0)
    # Applied multiplicative penalty on cognitive_weight for this category
    weight_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="behavioral_weights")


class VelocityRecord(Base):
    """Focus-timer payload — drives silent η₀ updates."""
    __tablename__ = "velocity_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id"), nullable=True)
    category: Mapped[str] = mapped_column(String, default="General")
    estimated_hours: Mapped[float] = mapped_column(Float)
    actual_hours: Mapped[float] = mapped_column(Float)
    # actual / estimated — stored for rolling average
    velocity_ratio: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="velocity_records")


class CalendarEvent(Base):
    """Fixed Google Calendar events — immutable blocks for the MILP solver."""
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    google_event_id: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String)
    start_dt: Mapped[str] = mapped_column(String)   # ISO datetime string
    end_dt: Mapped[str] = mapped_column(String)
    is_fixed: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship("User", back_populates="calendar_events")


class ScenarioCache(Base):
    """Holds Scenario B (optimized schedule) separate from live calendar until user commits."""
    __tablename__ = "scenario_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    # "A" = baseline live calendar | "B" = MILP-optimized candidate
    scenario_type: Mapped[str] = mapped_column(String, default="B")
    tasks_json: Mapped[str] = mapped_column(Text)       # serialized scheduled blocks
    simulation_rp: Mapped[float] = mapped_column(Float, default=0.0)
    simulation_sc: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="scenario_caches")
