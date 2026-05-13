"""
UserProfile — single document in MongoDB.
Singleton pattern: always the same _id = "main_user".
The full profile is injected as context into every AI-generated message.
"""
from typing import Optional
from beanie import Document
from pydantic import BaseModel, EmailStr


class SMTPConfig(BaseModel):
    host: str = ""
    port: int = 587
    user: str = ""
    password: str = ""       # stored encrypted in prod
    from_name: str = ""
    use_tls: bool = True


class WhatsAppConfig(BaseModel):
    phone_number: str = ""
    session_id: str = ""
    status: str = "disconnected"   # disconnected | qr_pending | connected
    qr_code: str = ""             # base64 PNG


class UserProfile(Document):
    # Singleton — always fetched/updated by this fixed id
    SINGLETON_ID: str = "main_user"

    # ── Identity (used to personalise every generated message) ────────────
    full_name: str = ""
    designation: str = ""          # e.g. "Business Development Manager"
    company_name: str = ""
    company_tagline: str = ""      # e.g. "Automate your sales pipeline"
    industry: str = ""
    website: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    country: str = ""
    linkedin_url: str = ""

    # ── Outreach preferences ───────────────────────────────────────────────
    email_signature_html: str = ""
    preferred_tone: str = "professional"  # professional | friendly | formal | casual
    intro_line: str = ""           # e.g. "I'm reaching out because..."
    value_proposition: str = ""   # what user offers — injected into every pitch

    # ── Integrations ───────────────────────────────────────────────────────
    smtp: SMTPConfig = SMTPConfig()
    whatsapp: WhatsAppConfig = WhatsAppConfig()

    # ── Avatar ─────────────────────────────────────────────────────────────
    avatar_url: str = ""

    class Settings:
        name = "user_profile"

    @classmethod
    async def get_profile(cls) -> "UserProfile":
        """Always return the single user profile, creating it if absent."""
        profile = await cls.find_one({"_id": cls.SINGLETON_ID})
        if not profile:
            profile = cls()
            profile.id = cls.SINGLETON_ID   # type: ignore[assignment]
            await profile.insert()
        return profile