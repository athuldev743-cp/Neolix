"""
Email Campaign API
"""
import asyncio
import random
import re
import ssl
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.email_campaign import EmailCampaign, EmailQueueItem, LeadSnapshot
from app.services.groq_ai import personalise_email, generate_email_template
from app.services.email_sender import send_email
from app.models.user_profile import UserProfile

import asyncpg
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

# ── Schemas ───────────────────────────────────────────────────────────────────
class CampaignCreateIn(BaseModel):
    campaign_name: str
    subject_template: str
    body_template: str
    lead_ids: List[int]
    personalise: bool = True
    daily_limit: int = 100
    send_order: str = "as_selected"

class PreviewIn(BaseModel):
    subject: str
    body: str
    lead_id: int
    personalise: bool = True
    generate_template: bool = False   # if True, ignore subject/body and generate fresh
    context_hint: str = ""

# ── DB helper — same SSL fix as leads.py ──────────────────────────────────────
async def pg_conn():
    url = settings.AIVEN_DATABASE_URL
    if not url:
        raise HTTPException(500, "AIVEN_DATABASE_URL not configured")
    clean_url = re.sub(r'[?&](sslmode|application_name|target_session_attrs)=\w+', '', url)
    clean_url = clean_url.rstrip('?&')
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    try:
        return await asyncpg.connect(clean_url, ssl=ssl_ctx, timeout=15)
    except Exception as e:
        raise HTTPException(500, f"DB connection failed: {str(e)}")

async def fetch_leads(lead_ids: list[int]) -> list[dict]:
    if not lead_ids:
        return []
    conn = await pg_conn()
    try:
        rows = await conn.fetch(
            "SELECT id, email, contact_name, company_name, business_details FROM leads WHERE id = ANY($1)",
            lead_ids
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()

# ── Create campaign ───────────────────────────────────────────────────────────
@router.post("/create")
async def create_campaign(data: CampaignCreateIn, bg: BackgroundTasks):
    if not data.lead_ids:
        raise HTTPException(400, "No leads provided")

    leads = await fetch_leads(data.lead_ids)
    valid = [l for l in leads if l.get("email")]
    if not valid:
        raise HTTPException(400, "None of the selected leads have an email address")

    campaign = EmailCampaign(
        campaign_name=data.campaign_name,
        subject_template=data.subject_template,
        body_template=data.body_template,
        personalise=data.personalise,
        daily_limit=min(data.daily_limit, 200),
        status="queued",
        total_leads=len(valid),
    )
    await campaign.insert()

    if data.send_order == "random":
        random.shuffle(valid)

    limit = campaign.daily_limit
    queue_items = []
    for i, lead in enumerate(valid):
        day = i // limit
        item = EmailQueueItem(
            campaign_id=str(campaign.id),
            lead=LeadSnapshot(
                email=lead["email"],
                name=lead.get("contact_name", ""),
                company=lead.get("company_name", ""),
                business_details=lead.get("business_details", ""),
            ),
            scheduled_day=day,
            status="pending",
        )
        queue_items.append(item)

    await EmailQueueItem.insert_many(queue_items)
    bg.add_task(process_campaign_day, str(campaign.id), 0)

    return {
        "campaign_id": str(campaign.id),
        "name": campaign.campaign_name,
        "total_leads": len(valid),
        "daily_limit": limit,
        "days_needed": (len(valid) + limit - 1) // limit,
    }

# ── Queue processor ───────────────────────────────────────────────────────────
async def process_campaign_day(campaign_id: str, day: int):
    campaign = await EmailCampaign.get(PydanticObjectId(campaign_id))
    if not campaign:
        return

    await EmailCampaign.find_one(EmailCampaign.id == campaign.id).update(
        {"$set": {"status": "running"}}
    )

    profile = await UserProfile.get_profile()
    signature = profile.email_signature_html or ""

    items = await EmailQueueItem.find(
        EmailQueueItem.campaign_id == campaign_id,
        EmailQueueItem.scheduled_day == day,
        EmailQueueItem.status == "pending",
    ).to_list()

    sent = failed = 0

    for item in items:
        try:
            if campaign.personalise:
                subject, body = await personalise_email(
                    campaign.subject_template,
                    campaign.body_template,
                    item.lead.name,
                    item.lead.company,
                    item.lead.business_details,
                )
            else:
                subject = campaign.subject_template \
                    .replace("{lead_name}", item.lead.name or "there") \
                    .replace("{lead_company}", item.lead.company or "your company")
                body = campaign.body_template \
                    .replace("{lead_name}", item.lead.name or "there") \
                    .replace("{lead_company}", item.lead.company or "your company")

            await send_email(
                to_email=item.lead.email,
                to_name=item.lead.name,
                subject=subject,
                body_text=body,
                signature_html=signature,
            )

            await item.update({"$set": {
                "status": "sent",
                "personalised_subject": subject,
                "personalised_body": body,
                "sent_at": datetime.now(timezone.utc),
            }})
            sent += 1

        except Exception as e:
            await item.update({"$set": {"status": "failed", "error": str(e)[:200]}})
            failed += 1

        delay = random.uniform(60, 180) + random.choice([0, 0, 0, 30, 60])
        await asyncio.sleep(delay)

    await campaign.update({"$inc": {"sent_count": sent, "failed_count": failed}})

    next_day_count = await EmailQueueItem.find(
        EmailQueueItem.campaign_id == campaign_id,
        EmailQueueItem.scheduled_day == day + 1,
        EmailQueueItem.status == "pending",
    ).count()

    if next_day_count > 0:
        await asyncio.sleep(86400)
        await process_campaign_day(campaign_id, day + 1)
    else:
        await EmailCampaign.find_one(EmailCampaign.id == campaign.id).update(
            {"$set": {"status": "completed"}}
        )

# ── List campaigns ────────────────────────────────────────────────────────────
@router.get("/list")
async def list_campaigns():
    campaigns = await EmailCampaign.find_all().sort("-created_at").to_list()
    return [
        {
            "id": str(c.id),
            "name": c.campaign_name,
            "status": c.status,
            "total_leads": c.total_leads,
            "sent": c.sent_count,
            "failed": c.failed_count,
            "daily_limit": c.daily_limit,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in campaigns
    ]

# ── Campaign detail ───────────────────────────────────────────────────────────
@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str):
    campaign = await EmailCampaign.get(PydanticObjectId(campaign_id))
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    items = await EmailQueueItem.find(
        EmailQueueItem.campaign_id == campaign_id
    ).sort("-created_at").limit(50).to_list()

    fail_reasons: dict[str, int] = {}
    for item in items:
        if item.status == "failed" and item.error:
            key = item.error[:60]
            fail_reasons[key] = fail_reasons.get(key, 0) + 1

    leads_preview = [
        {
            "email": i.lead.email,
            "company_name": i.lead.company,
            "status": i.status,
            "error": i.error,
            "sent_at": i.sent_at.isoformat() if i.sent_at else None,
        }
        for i in items
    ]

    return {
        "id": str(campaign.id),
        "name": campaign.campaign_name,
        "status": campaign.status,
        "total_leads": campaign.total_leads,
        "sent": campaign.sent_count,
        "failed": campaign.failed_count,
        "daily_limit": campaign.daily_limit,
        "fail_reasons": fail_reasons,
        "leads_preview": leads_preview,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
    }

# ── Preview / AI generate ─────────────────────────────────────────────────────
@router.post("/preview")
async def preview_email(data: PreviewIn):
    # ── Mode 1: AI template generation (no lead needed) ──────────────────────
    if data.generate_template:
        hint = data.context_hint or "cold outreach to business leads"
        subject, body = await generate_email_template(hint)
        return {
            "subject": subject,
            "body": body,
            "lead_name": "",
            "lead_company": "",
        }

    # ── Mode 2: Preview for a specific lead ───────────────────────────────────
    name = company = biz = ""

    # Only query DB if we have a real lead_id
    if data.lead_id and data.lead_id > 0:
        conn = await pg_conn()
        try:
            row = await conn.fetchrow(
                "SELECT contact_name, company_name, business_details FROM leads WHERE id = $1",
                data.lead_id
            )
            if row:
                name    = row["contact_name"]    or ""
                company = row["company_name"]    or ""
                biz     = row["business_details"] or ""
        finally:
            await conn.close()

    subject = data.subject or ""
    body    = data.body    or ""

    if not subject and not body:
        # Generate fresh template when both are empty
        subject, body = await generate_email_template("cold outreach")

    if data.personalise and (name or company):
        subject, body = await personalise_email(subject, body, name, company, biz)
    else:
        subject = subject.replace("{lead_name}", name or "there").replace("{lead_company}", company or "your company")
        body    = body.replace("{lead_name}",    name or "there").replace("{lead_company}", company or "your company")

    return {
        "subject": subject,
        "body": body,
        "lead_name": name,
        "lead_company": company,
    }