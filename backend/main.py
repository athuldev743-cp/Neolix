"""
Neolix Hub — FastAPI application
Module 1: Core Foundation (MongoDB profile + API shell)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.config import get_settings
from app.core.database import connect_mongo, disconnect_mongo
from app.api.v1 import profile, health

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} [{settings.APP_ENV}]")
    await connect_mongo()
    yield
    await disconnect_mongo()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Lead Management & Outreach System — Module 1: Core Foundation",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────

origins = [
    "http://localhost:5173",            # Local React (Vite)
    "https://neolix-sage.vercel.app",            # Local React (CRA)
    "" # Your live production URL
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(profile.router, prefix="/api/v1")

# ── Modules added progressively ───────────────────────────────────────────────
# Module 2: from app.api.v1 import leads  → app.include_router(leads.router, ...)
# Module 3: from app.api.v1 import ocr    → app.include_router(ocr.router, ...)
# Module 4: from app.api.v1 import outreach → app.include_router(outreach.router, ...)
# Module 5: from app.api.v1 import settings → app.include_router(settings.router, ...)