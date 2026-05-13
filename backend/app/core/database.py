"""
MongoDB async connection via Motor + Beanie ODM.
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

    from app.models.user_profile import UserProfile
    from app.models.outreach_log import OutreachLog
    from app.models.email_campaign import EmailCampaign, EmailQueueItem, EmailReply
    from app.api.v1.whatsapp import WACampaign, WAQueueItem

    await init_beanie(
        database=_client[settings.MONGODB_DB_NAME],
        document_models=[
            UserProfile,
            OutreachLog,
            EmailCampaign,
            EmailQueueItem,
            EmailReply,
            WACampaign,
            WAQueueItem,
        ],
    )
    logger.success("MongoDB connected ✓")


async def disconnect_mongo():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB disconnected")


def get_db():
    return _client[settings.MONGODB_DB_NAME]