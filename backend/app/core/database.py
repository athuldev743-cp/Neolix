"""
MongoDB async connection via Motor.
Beanie ODM is initialised on app startup with all document models.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import get_settings
from loguru import logger

settings = get_settings()

_client: AsyncIOMotorClient | None = None


async def connect_mongo():
    global _client
    logger.info("Connecting to MongoDB…")
    _client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Import here to avoid circular imports
    from app.models.user_profile import UserProfile
    from app.models.outreach_log import OutreachLog

    await init_beanie(
        database=_client[settings.MONGODB_DB_NAME],
        document_models=[UserProfile, OutreachLog],
    )
    logger.success("MongoDB connected ✓")


async def disconnect_mongo():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB disconnected")


def get_db():
    """Return the raw Motor database (for custom queries outside Beanie)."""
    return _client[settings.MONGODB_DB_NAME]