"""Outreach log — stored in MongoDB. Links a lead (PG id) to a sent message."""
from datetime import datetime, timezone
from typing import Optional
from beanie import Document


class OutreachLog(Document):
    lead_id: str                         # UUID from PostgreSQL leads table
    lead_name: str = ""
    lead_email: str = ""
    lead_phone: str = ""
    channel: str                         # "email" | "whatsapp"
    status: str = "queued"               # queued | sent | failed
    subject: Optional[str] = None
    body_preview: str = ""
    error: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "outreach_logs"