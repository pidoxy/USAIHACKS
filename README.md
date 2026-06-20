# KRONOS — ChronoForge

A chrono-kinetic life-simulation engine. Stress-test your schedule with adversarial
Monte Carlo simulations and a deterministic constraint solver **before** you risk your
real-world GPA or career.

This is a monorepo:

```
.
├── frontend/   Next.js 16 (App Router) — the "Tactical Futurism" UI
└── backend/    FastAPI engine (reference source; see note below)
```

- **Live engine API:** https://usaihacks.onrender.com/docs
- **Frontend:** deploys to Vercel (see below)

> **Backend source** lives in `backend/` — the full v1.0.0 engine: Google OAuth,
> calendar sync, velocity learning, behavioral weights, a MILP arbitrage solver, and
> Gemini-powered ingestion. The frontend integrates against the **deployed** contract at
> https://usaihacks.onrender.com; treat its `openapi.json` as the source of truth for
> request/response shapes.

## How the frontend talks to the backend

The browser only ever calls the **same origin** under `/api/*`. Next.js
[`rewrites()`](frontend/next.config.ts) proxy those requests server-side to the engine:

```
browser → /api/simulate/monte-carlo  →  Vercel (rewrite)  →  usaihacks.onrender.com
```

This avoids CORS completely (the live API uses credentials, so a wildcard origin is
impossible). The typed client lives in [`frontend/lib/api`](frontend/lib/api) and shared
state (ingested tasks, last results, linked user) in
[`frontend/lib/store`](frontend/lib/store/TaskStore.tsx).

Integrated endpoints: ingest (PDF + brain-dump → Gemini 2.5 Flash), Monte Carlo simulate,
arbitrage optimiser (+ calendar commit when a Google account is linked), velocity
profile and chronotype analytics, and the Google OAuth entry point.

## Local development

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000  (API proxied to the live engine)
```

No env vars are required — the proxy points at the deployed engine by default.
See [`frontend/.env.example`](frontend/.env.example) to override.

## Deploy to Vercel

The app lives in `frontend/`, so Vercel's **Root Directory must be set to `frontend`.**

**Option A — Git integration (recommended)**
1. Import `pidoxy/USAIHACKS` at https://vercel.com/new
2. Set **Root Directory** = `frontend`
3. Framework preset: Next.js (auto-detected). Deploy.
4. Every push to the connected branch redeploys.

**Option B — Vercel CLI**
```bash
cd frontend
vercel            # first run: log in + link the project
vercel --prod     # production deploy
```

No environment variables are needed for a default deploy. The `/api/*` rewrite in
`next.config.ts` proxies to the engine, so the frontend works as soon as it's live.

> **Cold starts:** the engine runs on Render's free tier and spins down when idle.
> The app pings `/health` on load to wake it; the first request after a long idle can
> still take ~30s.
