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
  MeResponse,
} from "@/lib/api/types";
import { API_BASE } from "@/lib/api/config";
import { api, ApiError } from "@/lib/api/client";

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

/* ---------- context ---------- */

interface StoreShape {
  hydrated: boolean;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  authNotice: string | null;
  tasks: KronosTask[];
  setTasks: (t: KronosTask[]) => void;
  addTasks: (t: KronosTask[]) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<KronosTask>) => void;
  clearTasks: () => void;
  lastArbitrage: ArbitrageResponse | null;
  setLastArbitrage: (r: ArbitrageResponse | null) => void;

  lastSimulation: SimulateResponse | null;
  setLastSimulation: (r: SimulateResponse | null) => void;

  userId: number | null;
  me: MeResponse | null;
  setUserId: (id: number | null) => void;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => void;
  clearAuthNotice: () => void;
}

const StoreContext = createContext<StoreShape | null>(null);

const LS_TASKS = "kronos.tasks";
const LS_USER = "kronos.userId";
const SS_AUTH_RETURN_TO = "kronos.authReturnTo";

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [tasks, setTasksState] = useState<KronosTask[]>([]);
  const [lastArbitrage, setLastArbitrage] = useState<ArbitrageResponse | null>(
    null,
  );
  const [lastSimulation, setLastSimulation] = useState<SimulateResponse | null>(
    null,
  );
  const [userId, setUserIdState] = useState<number | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const rawTasks = localStorage.getItem(LS_TASKS);
        if (rawTasks) {
          const parsed = JSON.parse(rawTasks) as KronosTask[];
          if (Array.isArray(parsed)) setTasksState(parsed);
        }
        const rawUser = localStorage.getItem(LS_USER);
        if (rawUser) setUserIdState(Number(rawUser) || null);
        const url = new URL(window.location.href);
        const callbackUserId = url.searchParams.get("user_id");
        if (callbackUserId && Number(callbackUserId)) {
          const nextUserId = Number(callbackUserId);
          setUserIdState(nextUserId);
          localStorage.setItem(LS_USER, String(nextUserId));
          setAuthNotice(
            "Calendar connected. Kronos can now plan around your real schedule.",
          );
          url.searchParams.delete("user_id");
          const cleaned = `${url.pathname}${url.search}${url.hash}`;
          const returnTo = sessionStorage.getItem(SS_AUTH_RETURN_TO);
          sessionStorage.removeItem(SS_AUTH_RETURN_TO);
          window.history.replaceState({}, "", cleaned || "/");
          if (returnTo && returnTo !== cleaned) {
            window.location.replace(returnTo);
            return;
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
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

  // Confirm stored auth state against the backend.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (userId == null) {
        setMe(null);
        setAuthReady(true);
        setAuthBusy(false);
        return;
      }
      setAuthBusy(true);
      setAuthError(null);
      api
        .me(userId)
        .then((profile) => {
          if (cancelled) return;
          setMe(profile);
          setAuthReady(true);
        })
        .catch((e) => {
          if (cancelled) return;
          setMe(null);
          setUserIdState(null);
          try {
            localStorage.removeItem(LS_USER);
          } catch {
            /* ignore */
          }
          setAuthError(
            e instanceof ApiError
              ? e.message
              : "Could not confirm your calendar login.",
          );
          setAuthReady(true);
        })
        .finally(() => {
          if (!cancelled) setAuthBusy(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

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
  const setUserId = useCallback((id: number | null) => setUserIdState(id), []);
  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);
  const disconnectCalendar = useCallback(() => {
    setUserIdState(null);
    setMe(null);
    setAuthError(null);
    setAuthNotice("Calendar disconnected.");
  }, []);
  const connectCalendar = useCallback(async () => {
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      sessionStorage.setItem(
        SS_AUTH_RETURN_TO,
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
      const { auth_url } = await api.googleAuthUrl();
      window.location.href = auth_url;
    } catch (e) {
      setAuthBusy(false);
      setAuthError(
        e instanceof ApiError
          ? e.message
          : "Calendar connection is unavailable right now.",
      );
    }
  }, [authBusy]);

  const value = useMemo<StoreShape>(
    () => ({
      hydrated,
      authReady,
      authBusy,
      authError,
      authNotice,
      tasks,
      setTasks,
      addTasks,
      removeTask,
      updateTask,
      clearTasks,
      lastArbitrage,
      setLastArbitrage,
      lastSimulation,
      setLastSimulation,
      userId,
      me,
      setUserId,
      connectCalendar,
      disconnectCalendar,
      clearAuthNotice,
    }),
    [
      hydrated,
      authReady,
      authBusy,
      authError,
      authNotice,
      tasks,
      setTasks,
      addTasks,
      removeTask,
      updateTask,
      clearTasks,
      lastArbitrage,
      lastSimulation,
      userId,
      me,
      setUserId,
      connectCalendar,
      disconnectCalendar,
      clearAuthNotice,
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
