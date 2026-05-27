"""
MusicManager — FastAPI application entry point.
"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import create_tables
from app.routers import auth, sources, files, admin
from app.services import scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="MusicManager",
    description="Multi-user music library manager with cloud storage support",
    version="1.0.0",
)

# CORS (allows the React dev server and same-origin production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_tables()
    scheduler.start()
    logging.getLogger(__name__).info("MusicManager started")


@app.on_event("shutdown")
async def shutdown():
    scheduler.stop()


# API routers
app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(files.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React frontend from /app/static (built in Docker)
static_dir = "/app/static"
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        index = f"{static_dir}/index.html"
        if os.path.exists(index):
            return FileResponse(index)
        return {"error": "Frontend not built"}
