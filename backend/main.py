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
    # Log startup details for Render debugging
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")
    await connect_mongo()
    yield
    await disconnect_mongo()
    logger.info("Shutdown complete")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Lead Management & Outreach System",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# This pulls from settings.cors_origins (which we configured to parse a list)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

# Health check at root for Render/Uptime monitoring
app.include_router(health.router, tags=["System"])

# API v1 Routes
app.include_router(profile.router, prefix="/api/v1", tags=["Profile"])

# Note: Once you create the outreach router in v1, add it here:
# from app.api.v1 import outreach
# app.include_router(outreach.router, prefix="/api/v1", tags=["Outreach"])