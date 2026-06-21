# KRONOS

**Turn academic chaos into a plan that survives real life.**

KRONOS is an AI-powered study planning system for students. You dump in your syllabi, task lists, or just talk — KRONOS pulls out every deadline and workload estimate, builds a schedule around your actual calendar, and stress-tests that schedule before the week starts.

**Live demo → [usaihacks.vercel.app](https://usaihacks.vercel.app)**  
**API docs → [usaihacks.onrender.com/docs](https://usaihacks.onrender.com/docs)**

---

## The problem

Students don't fail because they forget to write things down. They fail because turning a pile of assignments into a real plan — one that fits their classes, energy levels, and the randomness of actual life — is genuinely hard. Most tools stop at reminders. KRONOS goes further.

---

## What it does

### 1. Capture anything
- **Voice input** — speak your tasks, get live transcription powered by Spitch AI
- **Text paste** — drop in a brain dump, assignment list, or email thread
- **PDF upload** — drag in a syllabus and KRONOS extracts every deadline automatically

### 2. Extract structure
Gemini 2.5 Flash reads your input and produces a structured task list: title, due date, workload hours, and cognitive intensity — enforced via JSON schema, no hallucinations.

### 3. Build a real schedule
A deterministic optimization engine (PuLP) converts tasks into time blocks that respect:
- fixed events from Google Calendar
- your chronotype (morning vs. evening person)
- realistic daily study capacity

### 4. Stress-test it
Monte Carlo simulation runs your plan against disruption scenarios — sick days, late nights, unexpected work — and tells you how likely your plan is to hold.

### 5. Improve over time
Velocity tracking measures how long your tasks actually take. Behavior signals adjust future planning weights so the schedule gets more accurate each week.

---

## Feature highlights

| Feature | Detail |
|---|---|
| Voice task capture | Live mic transcription via Spitch API with partial-result streaming |
| PDF ingestion | Gemini extracts tasks from syllabi with structured output |
| Text brain dump | Paste anything — KRONOS finds the tasks |
| Study plan builder | Constraint-based optimization via PuLP |
| Monte Carlo stress test | 1,000-scenario simulation to score plan resilience |
| Google Calendar sync | Read fixed events, write study blocks back |
| Velocity learning | Tracks actual vs. estimated time to refine future schedules |
| Chronotype support | Plans around morning / evening energy preferences |

---

## Architecture

Monorepo with a Next.js 16 frontend on Vercel and a FastAPI backend on Render.

```
.
├── frontend/   Next.js 16 + React 19 (Vercel)
└── backend/    FastAPI planning engine (Render)
```

The frontend talks to the backend through typed API helpers (`frontend/lib/api/`) and avoids CORS via a Next.js rewrite proxy. The WebSocket voice endpoint connects directly to the backend for real-time streaming.

### Backend routers

| Route | Purpose |
|---|---|
| `/api/ingest` | PDF and text task extraction (Gemini) |
| `/api/voice` | Live mic transcription (Spitch) + one-shot audio |
| `/api/simulate` | Monte Carlo stress testing |
| `/api/optimize` | Schedule arbitrage and calendar write-back |
| `/api/calendar` | Google Calendar read/write |
| `/api/velocity` | Study velocity tracking |
| `/api/behavior` | Snooze patterns and planning weight adjustment |
| `/api/auth` | Google OAuth |

---

## Tech stack

**Frontend**
- TypeScript · Next.js 16 · React 19
- Tailwind CSS 4 · Framer Motion · Lucide React

**Backend**
- Python · FastAPI · SQLAlchemy · PostgreSQL
- PuLP (LP solver) · NumPy · SciPy

**AI & APIs**
- Gemini 2.5 Flash — structured task extraction
- Spitch AI — speech-to-text with live streaming
- Google OAuth + Calendar API

**Infrastructure**
- Vercel (frontend) · Render (backend)

---

## Voice feature

The mic button on the capture screen opens a WebSocket to the KRONOS backend, which streams your audio to the Spitch speech-to-text API in 3-second chunks. Partial transcripts appear live as you speak. When you stop, the final transcript lands in the task input and gets processed by Gemini exactly like a typed brain dump.

```
Browser mic → MediaRecorder (webm/opus)
    → WS /api/voice/live (FastAPI)
        → Spitch REST (per-chunk)
            → partial transcript → WS response
→ Frontend live text → append to brain dump → Gemini extraction → task list
```

---

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend proxies `/api/*` requests to the deployed backend. To run against a local backend:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ENGINE_ORIGIN=http://localhost:8000
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Required environment variables (`.env`):

```
GEMINI_API_KEY=...
SPITCH_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

---

## Screenshots

| Task capture | Dashboard |
|---|---|
| ![Task capture](docs/media/task-capture-mobile.png) | ![Dashboard](docs/media/dashboard.png) |

| Schedule optimizer | Stress test |
|---|---|
| ![Schedule optimizer](docs/media/schedule-optimizer.png) | ![Stress test](docs/media/stress-test.png) |

---

## Why KRONOS

Students usually have the tools to track tasks. What they rarely have is a system that translates those tasks into a plan that can survive the actual week — the late nights, the sick days, the class that runs long. KRONOS is built to close that gap: capture the chaos, extract the structure, build a real schedule, and test it before the week starts.
