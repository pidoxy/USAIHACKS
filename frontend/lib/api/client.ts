import { API_BASE } from "./config";
import type {
  IngestResponse,
  SimulateRequest,
  SimulateResponse,
  ArbitrageRequest,
  ArbitrageResponse,
  CommitRequest,
  FixedEventOut,
  WriteRequest,
  WriteResponse,
  VelocityPayload,
  VelocityResponse,
  VelocityProfile,
  SnoozePayload,
  SnoozeResponse,
  WeightsResponse,
  AuthUrlResponse,
  MeResponse,
  HealthResponse,
} from "./types";

/** Thrown on any non-2xx response, with a human-readable message extracted from FastAPI's body. */
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    // FastAPI validation errors: { detail: [{ msg, loc }] }
    if (Array.isArray(d.detail) && d.detail.length) {
      const first = d.detail[0] as Record<string, unknown>;
      if (typeof first?.msg === "string") return first.msg;
    }
    if (typeof d.detail === "string") return d.detail;
    if (typeof d.message === "string") return d.message;
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch (e) {
    // Network / DNS / cold-start failure
    throw new ApiError(
      0,
      "Could not reach the KRONOS engine. It may be waking from sleep — try again in a moment.",
      e,
    );
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data, res.statusText), data);
  }
  return data as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  /* Ingestion */
  ingestText: (content: string) =>
    request<IngestResponse>("/api/ingest/text", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ content }).toString(),
    }),

  ingestPdf: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<IngestResponse>("/api/ingest/pdf", {
      method: "POST",
      body: form,
    });
  },

  /* Simulation */
  simulate: (body: SimulateRequest) =>
    postJson<SimulateResponse>("/api/simulate/monte-carlo", body),

  /* Optimization */
  arbitrage: (body: ArbitrageRequest) =>
    postJson<ArbitrageResponse>("/api/optimize/arbitrage", body),

  commit: (body: CommitRequest) =>
    postJson<{ status?: string; event_ids?: string[] }>(
      "/api/optimize/commit",
      body,
    ),

  /* Calendar */
  calendarEvents: (userId: number, days = 14) =>
    request<FixedEventOut[]>(
      `/api/calendar/events?user_id=${userId}&days=${days}`,
    ),

  calendarWrite: (body: WriteRequest) =>
    postJson<WriteResponse>("/api/calendar/write", body),

  deleteKronosEvents: (userId: number) =>
    request<unknown>(`/api/calendar/kronos?user_id=${userId}`, {
      method: "DELETE",
    }),

  /* Velocity */
  recordVelocity: (body: VelocityPayload) =>
    postJson<VelocityResponse>("/api/velocity/record", body),

  velocityProfile: (userId: number) =>
    request<VelocityProfile>(`/api/velocity/profile?user_id=${userId}`),

  /* Behavior */
  recordSnooze: (body: SnoozePayload) =>
    postJson<SnoozeResponse>("/api/behavior/snooze", body),

  behaviorWeights: (userId: number) =>
    request<WeightsResponse>(`/api/behavior/weights?user_id=${userId}`),

  resetCategory: (userId: number, category: string) =>
    postJson<unknown>(
      `/api/behavior/reset?user_id=${userId}&category=${encodeURIComponent(category)}`,
      {},
    ),

  /* Auth */
  googleAuthUrl: () => request<AuthUrlResponse>("/api/auth/google"),

  me: (userId: number) =>
    request<MeResponse>(`/api/auth/me?user_id=${userId}`),

  updateCircadian: (userId: number, circadianType: string) =>
    request<MeResponse>(
      `/api/auth/me/circadian?user_id=${userId}&circadian_type=${encodeURIComponent(circadianType)}`,
      { method: "PATCH" },
    ),
};
