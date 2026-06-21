# Kronos

Plan your study week around real life.

Kronos is an AI-assisted academic planning system that helps students turn messy task lists, PDF syllabi, and calendar commitments into a realistic study plan. Instead of stopping at reminders and to-do lists, Kronos helps answer harder questions:

- What should I work on next?
- Can I actually finish this on time?
- What happens if I lose a study day?
- How do I plan around classes, events, and my real schedule?

It combines structured AI extraction, deterministic scheduling, and stress-testing to help students build plans they can actually follow.

## Product preview

![Kronos cover](docs/media/cover-thumbnail.png)

### Gallery

| Capture | Dashboard |
| --- | --- |
| ![Task capture](docs/media/task-capture-mobile.png) | ![Dashboard](docs/media/dashboard.png) |

| Schedule optimizer | Stress test |
| --- | --- |
| ![Schedule optimizer](docs/media/schedule-optimizer.png) | ![Stress test](docs/media/stress-test.png) |

## What Kronos does

Kronos supports an end-to-end study planning workflow:

1. Capture work from pasted text or uploaded PDFs.
2. Extract structured tasks with due dates, workload, and cognitive intensity.
3. Build a study plan around real calendar commitments.
4. Stress-test that plan against disruptions and overload.
5. Show insights about schedule pressure, pacing, and study patterns.

## Core capabilities

- **Task ingestion**
  Paste a brain dump or upload a syllabus and Kronos extracts structured academic tasks.

- **Plan building**
  Convert tasks into a schedule that respects time windows, fixed events, and workload.

- **Stress testing**
  Simulate rough weeks and see whether the current plan still holds.

- **Calendar-aware planning**
  Link Google Calendar so Kronos can build around classes and existing commitments.

- **Study insights**
  Surface workload, pressure, pacing, and chronotype-style timing signals.

## How it works

Kronos uses AI where it is strongest, but does not hand the full planning problem to a model.

### Inputs

- pasted text and task dumps
- uploaded PDF syllabi
- user-linked Google Calendar events
- due dates, workload estimates, and task metadata
- behavior and study-history signals

### Processing

- **LLM-powered extraction** turns messy input into structured tasks
- **deterministic optimization** builds a feasible study plan
- **Monte Carlo simulation** stress-tests the plan under disruption
- **velocity and behavior signals** personalize pacing and planning support

### Outputs

- structured task lists
- a proposed study schedule
- schedule pressure and resilience metrics
- calendar-aware recommendations
- student-friendly insight screens

## Architecture

Kronos is a monorepo with a Next.js frontend and a FastAPI backend.

```text
.
├── frontend/   Next.js 16 + React 19 student-facing app
└── backend/    FastAPI planning engine and integrations
```

### Frontend

The frontend is built in `frontend/` and focuses on the student experience:

- mobile-first task capture
- dashboard and overview screens
- plan builder
- stress-test view
- insights view
- Google Calendar connection flow

The frontend talks to the backend through typed API helpers in [`frontend/lib/api`](frontend/lib/api) and shared client state in [`frontend/lib/store/TaskStore.tsx`](frontend/lib/store/TaskStore.tsx).

### Backend

The backend in `backend/` provides the planning engine:

- auth and Google OAuth
- calendar sync
- text and PDF ingestion
- optimization and arbitrage scheduling
- Monte Carlo simulation
- study velocity and behavior tracking

The live deployed API is documented at [usaihacks.onrender.com/docs](https://usaihacks.onrender.com/docs).

## Tech stack

### Frontend

- TypeScript
- Next.js 16
- React 19
- Tailwind CSS 4
- Framer Motion
- Lucide React

### Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- PuLP
- NumPy
- SciPy

### Integrations and services

- Google OAuth
- Google Calendar API
- Gemini / Google Generative AI
- Vercel
- Render

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

By default the frontend proxies API requests to the deployed backend.

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

If you want to point the frontend at a local backend instead of the deployed one, use the variables in [`frontend/.env.example`](frontend/.env.example).

## Notes on the frontend-backend contract

The frontend integrates against the deployed API contract, and the typed request/response layer lives in:

- [`frontend/lib/api/client.ts`](frontend/lib/api/client.ts)
- [`frontend/lib/api/types.ts`](frontend/lib/api/types.ts)

The frontend also uses same-origin `/api/*` routes with a Next.js rewrite to avoid CORS issues when deployed.

## Design direction

The current frontend uses a softer, cleaner visual system designed for students:

- mobile-first layouts
- rounded soft-ui cards
- simpler wording
- low-friction navigation
- consistent brand assets and app icons

The goal is to make planning feel calmer and more approachable, not heavy or overly technical.

## Devpost media

The repo includes a small media kit in [`docs/media`](docs/media):

- `cover-thumbnail.png`
- `task-capture-mobile.png`
- `dashboard.png`
- `schedule-optimizer.png`
- `stress-test.png`

Suggested gallery order:

1. `cover-thumbnail.png`
2. `task-capture-mobile.png`
3. `dashboard.png`
4. `schedule-optimizer.png`
5. `stress-test.png`

## Why this project matters

Students usually do not fail because they cannot write down tasks. They struggle because they cannot easily translate all of their commitments into a realistic plan. Kronos is built to close that gap by helping users capture chaos, build a schedule, and test whether that schedule can survive real life.
