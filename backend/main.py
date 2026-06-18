from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import ingest, simulate, optimize

app = FastAPI(
    title="KRONOS Engine API",
    description="Chrono-Kinetic Simulation Engine — deterministic math backend for ChronoForge.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router,   prefix="/api/ingest",   tags=["Ingestion"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["Simulation"])
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimization"])


@app.get("/health")
def health():
    return {"status": "KRONOS engine online", "version": "0.1.0"}
