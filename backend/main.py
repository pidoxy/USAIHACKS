from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from config import settings
from routers import ingest, simulate, optimize, auth, calendar, velocity, behavior


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
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


@app.get("/health")
def health():
    return {"status": "KRONOS engine online", "version": "1.0.0"}
