from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from config import settings
from routers import ingest, simulate, optimize, auth, calendar, velocity, behavior, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="KRONOS Engine API",
    description=(
        "Adversarial Bounded-Rationality Chrono-Simulation Engine. "
        "Deterministic math backend — LLM restricted to zero-shot data extraction only."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Explicit production origins + localhost. The regex additionally covers Vercel
# preview deploys, which each get a unique *.vercel.app subdomain. Note: the
# frontend normally calls the API same-origin via a Next.js rewrite proxy, so
# these matter for direct calls and the OAuth flow.
ALLOWED_ORIGINS = list(dict.fromkeys([
    settings.FRONTEND_URL,
    "https://usaihacks.vercel.app",
    "http://localhost:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(ingest.router,   prefix="/api/ingest",   tags=["Ingestion"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["Simulation"])
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimization"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(velocity.router, prefix="/api/velocity", tags=["Velocity"])
app.include_router(behavior.router, prefix="/api/behavior", tags=["Behavior"])
app.include_router(voice.router,    prefix="/api/voice",    tags=["Voice"])


@app.get("/health")
def health():
    return {"status": "KRONOS engine online", "version": "1.0.0"}
