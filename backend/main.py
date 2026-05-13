"""
Neolix Hub — FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.config import get_settings
from app.core.database import connect_mongo, disconnect_mongo
from app.api.v1 import profile, health, leads, campaigns, replies, whatsapp

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")
    await connect_mongo()
    yield
    await disconnect_mongo()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Lead Management & Outreach System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,     tags=["System"])
app.include_router(profile.router,    prefix="/api/v1", tags=["Profile"])
app.include_router(leads.router,      prefix="/api/v1", tags=["Leads"])
app.include_router(campaigns.router,  prefix="/api/v1", tags=["Campaigns"])
app.include_router(replies.router,    prefix="/api/v1", tags=["Replies"])
app.include_router(whatsapp.router,   prefix="/api/v1", tags=["WhatsApp"])