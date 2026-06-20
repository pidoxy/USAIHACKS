"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  KronosTask,
  ExtractedTask,
  ArbitrageResponse,
  SimulateResponse,
} from "@/lib/api/types";
import { API_BASE } from "@/lib/api/config";

/* ---------- stress <-> cognitive_weight helpers (UI uses labels, API uses weights) ---------- */

export type StressLabel = "high" | "medium" | "low";

export function weightToStress(w: number): StressLabel {
  if (w >= 1.6) return "high";
  if (w >= 1.1) return "medium";
  return "low";
}

export function stressToWeight(s: StressLabel): number {
  return s === "high" ? 1.8 : s === "medium" ? 1.3 : 0.8;
}

export const STRESS_LABELS: Record<StressLabel, string> = {
  high: "High Stress",
  medium: "Moderate Focus",
  low: "Light / Easy",
};

let idCounter = 0;
export function newTaskId(): string {
  idCounter += 1;
  return `task-${Date.now().toString(36)}-${idCounter}`;
}

/** Attach a stable id to LLM-extracted tasks. */
export function withIds(tasks: ExtractedTask[]): KronosTask[] {
  return tasks.map((t) => ({ ...t, id: newTaskId(), completed_hours: 0 }));
}

/* ---------- seed data (only used on a truly empty first visit) ---------- */

const SEED_TASKS: KronosTask[] = [
  {
    id: "seed-1",
    title: "Advanced Calc Midterm Prep",
    due_date: "2026-06-28",
    workload_hours: 12,
    cognitive_weight: 1.8,
    is_flexible: true,
    category: "Study",
    completed_hours: 0,
  },
  {
    id: "seed-2",
    title: "Read Chapter 4: Thermodynamics",
    due_date: "2026-06-22",
    workload_hours: 3.5,
    cognitive_weight: 1.0,
    is_flexible: true,
    category: "Reading",
    completed_hours: 0,
  },
  {
    id: "seed-3",
    title: "Lab Report: Circuit Analysis",
    due_date: "2026-06-25",
    workload_hours: 6,
    cognitive_weight: 1.3,
    is_flexible: true,
    category: "Lab",
    completed_hours: 0,
  },
];

/* ---------- context ---------- */

interface StoreShape {
  hydrated: boolean;
  tasks: KronosTask[];
  setTasks: (t: KronosTask[]) => void;
  addTasks: (t: KronosTask[]) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<KronosTask>) => void;
  clearTasks: () => void;
  resetToSeed: () => void;

  lastArbitrage: ArbitrageResponse | null;
  setLastArbitrage: (r: ArbitrageResponse | null) => void;

  lastSimulation: SimulateResponse | null;
  setLastSimulation: (r: SimulateResponse | null) => void;

  userId: number | null;
  setUserId: (id: number | null) => void;
}

const StoreContext = createContext<StoreShape | null>(null);

const LS_TASKS = "kronos.tasks";
const LS_USER = "kronos.userId";

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [tasks, setTasksState] = useState<KronosTask[]>(SEED_TASKS);
  const [lastArbitrage, setLastArbitrage] = useState<ArbitrageResponse | null>(
    null,
  );
  const [lastSimulation, setLastSimulation] = useState<SimulateResponse | null>(
    null,
  );
  const [userId, setUserIdState] = useState<number | null>(null);

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    try {
      const rawTasks = localStorage.getItem(LS_TASKS);
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks) as KronosTask[];
        if (Array.isArray(parsed)) setTasksState(parsed);
      }
      const rawUser = localStorage.getItem(LS_USER);
      if (rawUser) setUserIdState(Number(rawUser) || null);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Proactively wake the engine — Render's free tier spins down when idle,
  // so the first real request can otherwise cold-start (~30s) or 502.
  useEffect(() => {
    fetch(`${API_BASE}/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  // Persist tasks.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
    } catch {
      /* storage full / unavailable */
    }
  }, [tasks, hydrated]);

  // Persist user id.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (userId == null) localStorage.removeItem(LS_USER);
      else localStorage.setItem(LS_USER, String(userId));
    } catch {
      /* ignore */
    }
  }, [userId, hydrated]);

  const setTasks = useCallback((t: KronosTask[]) => setTasksState(t), []);
  const addTasks = useCallback(
    (t: KronosTask[]) => setTasksState((prev) => [...prev, ...t]),
    [],
  );
  const removeTask = useCallback(
    (id: string) => setTasksState((prev) => prev.filter((x) => x.id !== id)),
    [],
  );
  const updateTask = useCallback(
    (id: string, patch: Partial<KronosTask>) =>
      setTasksState((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      ),
    [],
  );
  const clearTasks = useCallback(() => setTasksState([]), []);
  const resetToSeed = useCallback(() => setTasksState(SEED_TASKS), []);
  const setUserId = useCallback((id: number | null) => setUserIdState(id), []);

  const value = useMemo<StoreShape>(
    () => ({
      hydrated,
      tasks,
      setTasks,
      addTasks,
      removeTask,
      updateTask,
      clearTasks,
      resetToSeed,
      lastArbitrage,
      setLastArbitrage,
      lastSimulation,
      setLastSimulation,
      userId,
      setUserId,
    }),
    [
      hydrated,
      tasks,
      setTasks,
      addTasks,
      removeTask,
      updateTask,
      clearTasks,
      resetToSeed,
      lastArbitrage,
      lastSimulation,
      userId,
      setUserId,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within <TaskStoreProvider>");
  }
  return ctx;
}

/* ---------- selectors / derived helpers ---------- */

/** Map our tasks to the simulate endpoint's task shape. */
export function toSimulateTasks(tasks: KronosTask[]) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    workload_hours: t.workload_hours,
    cognitive_weight: t.cognitive_weight,
    is_flexible: t.is_flexible,
    category: t.category,
    completed_hours: t.completed_hours ?? 0,
  }));
}

/** Map our tasks to the arbitrage endpoint's task shape. */
export function toOptimizeTasks(tasks: KronosTask[]) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    workload_hours: t.workload_hours,
    cognitive_weight: t.cognitive_weight,
    is_flexible: t.is_flexible,
    category: t.category,
    weight_multiplier: 1.0,
  }));
}
