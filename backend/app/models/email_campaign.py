"""
Email campaign models.
- EmailCampaign: the campaign document (one per blast)
- EmailQueueItem: one per recipient, tracks send state & scheduling
- EmailReply: inbound reply matched to a campaign item
"""
from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel


class LeadSnapshot(BaseModel):
    """Copied at queue-time so deleting a lead doesn't corrupt history."""
    email: str
    name: str = ""
    company: str = ""
    business_details: str = ""


class EmailCampaign(Document):
    subject_template: str
    body_template: str          # raw template with {lead_name}, {lead_company} tokens
    personalise: bool = True    # use Groq to rewrite per lead
    daily_limit: int = 100
    status: str = "queued"      # queued | running | paused | completed | failed
    total_leads: int = 0
    sent_count: int = 0
    failed_count: int = 0
    created_at: datetime = datetime.utcnow()
    campaign_name: str = ""

    class Settings:
        name = "email_campaigns"


class EmailQueueItem(Document):
    campaign_id: str
    lead: LeadSnapshot
    status: str = "pending"         # pending | sent | failed | skipped
    scheduled_day: int = 0          # which day batch (0 = first 100, 1 = second, …)
    personalised_subject: str = ""
    personalised_body: str = ""
    error: str = ""
    sent_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "email_queue"


class EmailReply(Document):
    campaign_id: str
    queue_item_id: str
    from_email: str
    from_name: str = ""
    subject: str = ""
    body_text: str = ""
    body_html: str = ""
    received_at: datetime = datetime.utcnow()
    status: str = "unread"      # unread | read | responded
    our_reply: str = ""         # text of reply we sent back
    replied_at: Optional[datetime] = None

    class Settings:
        name = "email_replies"