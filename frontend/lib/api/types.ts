/**
 * TypeScript mirror of the live KRONOS Engine API (v1.0.0).
 * Source of truth: https://usaihacks.onrender.com/openapi.json
 *
 * NOTE: the deployed API differs from the stale `backend/` source in this repo
 * (it uses workload_hours / cognitive_weight, not hoursEstimated / stressLevel).
 */

/* ---------- Ingestion ---------- */

/** A task constraint as returned by the LLM ingestion gateway (no id). */
export interface ExtractedTask {
  title: string;
  due_date: string; // "YYYY-MM-DD"
  workload_hours: number;
  cognitive_weight: number; // ~0.5 – 3.0
  is_flexible: boolean;
  category: string;
}

export interface IngestResponse {
  tasks: ExtractedTask[];
  source_type: string; // "pdf" | "text"
  task_count: number;
}

/** Our client-side task: an ExtractedTask with a stable id + optional progress. */
export interface KronosTask extends ExtractedTask {
  id: string;
  completed_hours?: number;
}

/* ---------- Simulation (Monte Carlo) ---------- */

export interface SimulateTaskIn {
  id: string;
  title: string;
  due_date: string;
  workload_hours: number;
  cognitive_weight?: number;
  is_flexible?: boolean;
  category?: string;
  completed_hours?: number;
}

export interface SimulateRequest {
  tasks: SimulateTaskIn[];
  user_id?: number | null;
  n_runs?: number;
  hours_of_sleep?: number;
  start_date?: string | null;
}

export interface SimRunOut {
  run_id: number;
  survived: boolean;
  peak_stress: number;
  final_sc: number;
  consecutive_stress_hours: number;
  sick_day: number | null;
  creep_applied: boolean;
}

export interface SimulateResponse {
  path_resilience: number; // 0–100
  avg_sc: number;
  worst_sc: number;
  best_sc: number;
  survival_count: number;
  total_runs: number;
  ui_label_rp: string;
  ui_label_sc: string;
  runs: SimRunOut[];
}

/* ---------- Optimization (Arbitrage) ---------- */

export interface OptimizeTaskIn {
  id: string;
  title: string;
  due_date: string;
  workload_hours: number;
  cognitive_weight?: number;
  is_flexible?: boolean;
  category?: string;
  weight_multiplier?: number;
}

export interface FixedEventIn {
  id: string;
  title: string;
  start_dt: string;
  end_dt: string;
}

export interface ArbitrageRequest {
  tasks: OptimizeTaskIn[];
  fixed_events?: FixedEventIn[];
  user_id?: number | null;
  start_date?: string | null;
  n_days?: number;
}

export interface ScheduledBlockOut {
  task_id: string;
  title: string;
  date: string;
  start_hour: number;
  end_hour: number;
  cognitive_weight: number;
  load_pct: number;
  heat_color: string; // "green" | "amber" | "red" ...
}

export interface ArbitrageResponse {
  status: string;
  scheduled: ScheduledBlockOut[];
  unscheduled_ids: string[];
  final_sc: number;
  sleep_guarantee_hours: number;
  total_days: number;
  scenario_cache_id: number | null;
}

export interface CommitRequest {
  user_id: number;
  scenario_cache_id: number;
}

/* ---------- Calendar ---------- */

export interface FixedEventOut {
  id: string;
  title: string;
  start_dt: string;
  end_dt: string;
  is_fixed: boolean;
}

export interface CalendarBlock {
  task_id: string;
  title: string;
  date: string;
  start_hour: number;
  end_hour: number;
}

export interface WriteRequest {
  user_id: number;
  blocks: CalendarBlock[];
  scenario_cache_id?: number | null;
  timezone?: string;
}

export interface WriteResponse {
  inserted: number;
  failed: number;
  event_ids: string[];
}

/* ---------- Velocity ---------- */

export interface VelocityPayload {
  user_id: number;
  task_id?: number | null;
  category?: string;
  estimated_hours: number;
  actual_hours: number;
}

export interface VelocityResponse {
  velocity_ratio: number;
  new_eta_0: number;
  message: string;
}

export interface VelocityProfile {
  user_id: number;
  eta_0: number;
  category_ratios: Record<string, number>;
  total_records: number;
}

/* ---------- Behavior ---------- */

export interface SnoozePayload {
  user_id: number;
  task_id: number;
  category: string;
}

export interface SnoozeResponse {
  user_id: number;
  category: string;
  snooze_count: number;
  weight_multiplier: number;
  penalty_applied: boolean;
  message: string;
}

export interface WeightsResponse {
  user_id: number;
  weights: Array<Record<string, unknown>>;
}

/* ---------- Auth ---------- */

export interface AuthUrlResponse {
  auth_url: string;
}

export interface MeResponse {
  id?: number;
  email?: string;
  name?: string;
  circadian_type?: string;
  [k: string]: unknown;
}

/* ---------- Health ---------- */

export interface HealthResponse {
  status: string;
  version: string;
}
