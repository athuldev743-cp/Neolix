"""
WhatsApp API — bridges to omniv2.onrender.com (Baileys)
POST /whatsapp/send              — send single message
POST /whatsapp/campaign/create   — create WA campaign
GET  /whatsapp/campaign/list     — list campaigns
GET  /whatsapp/status            — connection status + QR
POST /whatsapp/logout            — logout
GET  /whatsapp/conversations      — all conversations
GET  /whatsapp/messages/{phone}  — messages with one contact
GET  /whatsapp/incoming          — poll new incoming messages
POST /whatsapp/respond           — send reply to a conversation
"""
import asyncio
import random
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import httpx

from app.config import get_settings
from app.services.groq_ai import personalise_whatsapp, generate_wa_reply
from app.models.user_profile import UserProfile

settings = get_settings()
router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

WA_BASE = "https://omniv2.onrender.com"
WA_DAILY_LIMIT = 50   # hard cap; user can select up to 200 → queued across days

# ── Simple in-memory WA campaign store (backed by MongoDB via model) ─────────
# We'll use a simple Beanie document for WA campaigns
from beanie import Document
from pydantic import BaseModel as PydanticBase

class WALeadSnapshot(PydanticBase):
    phone: str
    name: str = ""
    company: str = ""
    business_details: str = ""

class WACampaign(Document):
    campaign_name: str
    message_template: str
    personalise: bool = True
    daily_limit: int = 50
    status: str = "queued"   # queued|running|completed|failed
    total_leads: int = 0
    sent_count: int = 0
    failed_count: int = 0
    leads: List[WALeadSnapshot] = []
    pending_index: int = 0    # next lead to send
    last_batch_at: Optional[datetime] = None
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "wa_campaigns"

class WAQueueItem(Document):
    campaign_id: str
    lead: WALeadSnapshot
    status: str = "pending"   # pending|sent|failed
    personalised_message: str = ""
    error: str = ""
    sent_at: Optional[datetime] = None
    scheduled_day: int = 0
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "wa_queue"

# ── Schemas ────────────────────────────────────────────────────────────────────
class WASendIn(BaseModel):
    phone: str
    message: str

class WAImageIn(BaseModel):
    phone: str
    image_base64: str
    caption: str = ""

class WACampaignIn(BaseModel):
    campaign_name: str
    message_template: str
    lead_ids: List[int]       # PostgreSQL lead IDs
    personalise: bool = True
    daily_limit: int = 50
    send_order: str = "as_selected"

class WARespondIn(BaseModel):
    phone: str
    message: str

# ── Baileys bridge helpers ────────────────────────────────────────────────────
async def wa_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{WA_BASE}{path}")
        return r.json()

async def wa_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{WA_BASE}{path}", json=body)
        return r.json()

def normalize_phone(phone: str) -> str:
    """Normalize to international format without +."""
    p = "".join(c for c in phone if c.isdigit())
    if len(p) == 10 and p[0] in "6789":
        p = "91" + p
    return p

# ── Status & QR ───────────────────────────────────────────────────────────────
@router.get("/status")
async def wa_status():
    try:
        data = await wa_get("/status")
        qr_data = {}
        if not data.get("connected"):
            qr_data = await wa_get("/qr")
        return {
            "connected": data.get("connected", False),
            "uptime": data.get("uptime"),
            "qr_status": qr_data.get("status"),
            "qr": qr_data.get("qr"),
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@router.post("/logout")
async def wa_logout():
    try:
        data = await wa_post("/logout", {})
        return {"success": data.get("success", False)}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── Single send ───────────────────────────────────────────────────────────────
@router.post("/send")
async def wa_send(data: WASendIn):
    phone = normalize_phone(data.phone)
    result = await wa_post("/send", {"phone": phone, "message": data.message})
    if not result.get("success"):
        raise HTTPException(500, result.get("error", "Send failed"))
    return result

@router.post("/send-image")
async def wa_send_image(data: WAImageIn):
    phone = normalize_phone(data.phone)
    result = await wa_post("/send-image", {
        "phone": phone,
        "image_base64": data.image_base64,
        "caption": data.caption,
    })
    if not result.get("success"):
        raise HTTPException(500, result.get("error", "Image send failed"))
    return result

# ── Conversations ─────────────────────────────────────────────────────────────
@router.get("/conversations")
async def wa_conversations():
    try:
        data = await wa_get("/conversations")
        return data
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/messages/{phone}")
async def wa_messages(phone: str):
    try:
        phone = normalize_phone(phone)
        data = await wa_get(f"/messages/{phone}")
        return data
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/incoming")
async def wa_incoming():
    try:
        data = await wa_get("/incoming")
        return data
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/respond")
async def wa_respond(data: WARespondIn):
    return await wa_send(WASendIn(phone=data.phone, message=data.message))

# ── Campaign ──────────────────────────────────────────────────────────────────
import asyncpg

async def pg_conn():
    return await asyncpg.connect(settings.AIVEN_DATABASE_URL, ssl="require")

@router.post("/campaign/create")
async def wa_campaign_create(data: WACampaignIn, bg: BackgroundTasks):
    # Fetch leads with phones
    conn = await pg_conn()
    try:
        rows = await conn.fetch(
            "SELECT id, phone, contact_name, company_name, business_details FROM leads WHERE id = ANY($1)",
            data.lead_ids
        )
    finally:
        await conn.close()

    valid = [r for r in rows if r["phone"] and len("".join(c for c in r["phone"] if c.isdigit())) >= 10]
    if not valid:
        raise HTTPException(400, "No leads with valid phone numbers found")

    leads = [
        WALeadSnapshot(
            phone=normalize_phone(r["phone"]),
            name=r["contact_name"] or "",
            company=r["company_name"] or "",
            business_details=r["business_details"] or "",
        )
        for r in valid
    ]

    if data.send_order == "random":
        random.shuffle(leads)

    campaign = WACampaign(
        campaign_name=data.campaign_name,
        message_template=data.message_template,
        personalise=data.personalise,
        daily_limit=min(data.daily_limit, 200),
        total_leads=len(leads),
        leads=leads,
        status="queued",
    )
    await campaign.insert()

    # Enqueue items
    limit = campaign.daily_limit
    items = []
    for i, lead in enumerate(leads):
        items.append(WAQueueItem(
            campaign_id=str(campaign.id),
            lead=lead,
            scheduled_day=i // limit,
            status="pending",
        ))
    await WAQueueItem.insert_many(items)

    bg.add_task(process_wa_day, str(campaign.id), 0)

    return {
        "campaign_id": str(campaign.id),
        "total_leads": len(leads),
        "daily_limit": campaign.daily_limit,
        "days_needed": (len(leads) + campaign.daily_limit - 1) // campaign.daily_limit,
    }


async def process_wa_day(campaign_id: str, day: int):
    """Send WA messages for a given day with human-like intervals."""
    from beanie import PydanticObjectId
    campaign = await WACampaign.get(PydanticObjectId(campaign_id))
    if not campaign:
        return

    await WACampaign.find_one(WACampaign.id == campaign.id).update(
        {"$set": {"status": "running", "last_batch_at": datetime.now(timezone.utc)}}
    )

    items = await WAQueueItem.find(
        WAQueueItem.campaign_id == campaign_id,
        WAQueueItem.scheduled_day == day,
        WAQueueItem.status == "pending",
    ).to_list()

    sent = failed = 0

    for item in items:
        try:
            if campaign.personalise:
                msg = await personalise_whatsapp(
                    campaign.message_template,
                    item.lead.name,
                    item.lead.company,
                    item.lead.business_details,
                )
            else:
                msg = campaign.message_template \
                    .replace("{lead_name}", item.lead.name or "there") \
                    .replace("{lead_company}", item.lead.company or "your company")

            result = await wa_post("/send", {"phone": item.lead.phone, "message": msg})

            if result.get("success"):
                await item.update({"$set": {
                    "status": "sent",
                    "personalised_message": msg,
                    "sent_at": datetime.now(timezone.utc),
                }})
                sent += 1
            else:
                raise Exception(result.get("error", "Unknown WA error"))

        except Exception as e:
            await item.update({"$set": {"status": "failed", "error": str(e)[:200]}})
            failed += 1

        # Human-like delay: 60s–3min with random variance, never same interval
        delay = random.uniform(60, 180) + random.choice([0, 0, 15, 30, 45, 60, 90])
        await asyncio.sleep(delay)

    await campaign.update({"$inc": {"sent_count": sent, "failed_count": failed}})

    # Check if next day has items
    next_count = await WAQueueItem.find(
        WAQueueItem.campaign_id == campaign_id,
        WAQueueItem.scheduled_day == day + 1,
        WAQueueItem.status == "pending",
    ).count()

    if next_count > 0:
        await asyncio.sleep(86400)   # 24 hours
        await process_wa_day(campaign_id, day + 1)
    else:
        await WACampaign.find_one(WACampaign.id == campaign.id).update(
            {"$set": {"status": "completed"}}
        )


@router.get("/campaign/list")
async def wa_campaign_list():
    campaigns = await WACampaign.find_all().sort("-created_at").to_list()
    return [
        {
            "id": str(c.id),
            "name": c.campaign_name,
            "status": c.status,
            "total_leads": c.total_leads,
            "sent": c.sent_count,
            "failed": c.failed_count,
            "daily_limit": c.daily_limit,
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


@router.get("/campaign/{campaign_id}")
async def wa_campaign_detail(campaign_id: str):
    from beanie import PydanticObjectId
    campaign = await WACampaign.get(PydanticObjectId(campaign_id))
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    items = await WAQueueItem.find(
        WAQueueItem.campaign_id == campaign_id
    ).limit(100).to_list()

    return {
        "id": str(campaign.id),
        "name": campaign.campaign_name,
        "status": campaign.status,
        "total_leads": campaign.total_leads,
        "sent": campaign.sent_count,
        "failed": campaign.failed_count,
        "leads_preview": [
            {
                "phone": i.lead.phone,
                "name": i.lead.name,
                "company": i.lead.company,
                "status": i.status,
                "error": i.error,
                "sent_at": i.sent_at.isoformat() if i.sent_at else None,
            }
            for i in items
        ],
    }

@router.post("/ai-reply")
async def wa_ai_reply(payload: dict):
    """Generate AI reply for a WA conversation."""
    history = payload.get("history", [])
    from_name = payload.get("from_name", "")
    reply = await generate_wa_reply(history, from_name)
    return {"reply": reply}