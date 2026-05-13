"""
Email Replies API
GET  /replies/inbox          — unread/all inbound replies
GET  /replies/sent           — all emails we sent (from queue)
GET  /replies/{reply_id}     — full reply thread
POST /replies/{reply_id}/respond — send a reply
POST /replies/poll           — trigger IMAP poll manually
"""
import asyncio
import email as email_lib
import imaplib
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.email_campaign import EmailQueueItem, EmailReply
from app.services.email_sender import send_email
from app.services.groq_ai import generate_reply
from app.models.user_profile import UserProfile
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/replies", tags=["Replies"])

# ── Schemas ───────────────────────────────────────────────────────────────────
class RespondIn(BaseModel):
    body: str
    use_ai: bool = False

# ── IMAP helper ───────────────────────────────────────────────────────────────
def _imap_connect():
    host = settings.SMTP_HOST.replace("smtp.", "imap.")  # gmail: smtp→imap
    if "gmail" in host:
        host = "imap.gmail.com"
    elif "outlook" in host or "office365" in host:
        host = "outlook.office365.com"

    mail = imaplib.IMAP4_SSL(host, 993)
    mail.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    return mail

def _extract_body(msg) -> tuple[str, str]:
    """Return (plain_text, html_text)."""
    plain, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if "attachment" in cd:
                continue
            if ct == "text/plain":
                plain = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            elif ct == "text/html":
                html = part.get_payload(decode=True).decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True) or b""
        if msg.get_content_type() == "text/html":
            html = payload.decode("utf-8", errors="ignore")
        else:
            plain = payload.decode("utf-8", errors="ignore")
    return plain, html


async def poll_inbox():
    """
    Check IMAP inbox for replies to our campaign emails.
    Match by Message-ID / In-Reply-To against sent queue items.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return {"polled": 0, "new": 0, "error": "SMTP not configured"}

    try:
        mail = _imap_connect()
        mail.select("INBOX")

        # Fetch unseen messages
        _, data = mail.search(None, "UNSEEN")
        ids = data[0].split()
        new_count = 0

        for num in ids:
            _, raw = mail.fetch(num, "(RFC822)")
            raw_email = raw[0][1]
            msg = email_lib.message_from_bytes(raw_email)

            from_header = msg.get("From", "")
            from_email  = email_lib.utils.parseaddr(from_header)[1].lower()
            from_name   = email_lib.utils.parseaddr(from_header)[0]
            subject     = msg.get("Subject", "")
            in_reply_to = msg.get("In-Reply-To", "")
            references  = msg.get("References", "")
            plain, html = _extract_body(msg)

            # Try to find the queue item this is a reply to
            # Match by sender's email in our sent items
            queue_item = await EmailQueueItem.find_one(
                {"lead.email": from_email, "status": "sent"}
            )

            if not queue_item:
                # Try matching by subject (strip Re:)
                clean_subj = subject.lower().replace("re:", "").strip()
                queue_item = await EmailQueueItem.find_one(
                    {
                        "personalised_subject": {"$regex": clean_subj, "$options": "i"},
                        "status": "sent",
                    }
                ) if clean_subj else None

            campaign_id    = queue_item.campaign_id if queue_item else "unknown"
            queue_item_id  = str(queue_item.id) if queue_item else ""

            # Avoid duplicates
            exists = await EmailReply.find_one(
                {
                    "from_email": from_email,
                    "subject": subject,
                    "queue_item_id": queue_item_id,
                }
            )
            if exists:
                continue

            reply = EmailReply(
                campaign_id=campaign_id,
                queue_item_id=queue_item_id,
                from_email=from_email,
                from_name=from_name,
                subject=subject,
                body_text=plain[:5000],
                body_html=html[:20000],
                received_at=datetime.now(timezone.utc),
                status="unread",
            )
            await reply.insert()
            new_count += 1

        mail.logout()
        return {"polled": len(ids), "new": new_count}
    except Exception as e:
        return {"polled": 0, "new": 0, "error": str(e)}


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/inbox")
async def inbox(status: Optional[str] = None):
    """List inbound replies. status=unread|read|responded"""
    query = {}
    if status:
        query["status"] = status

    replies = await EmailReply.find(query).sort("-received_at").limit(200).to_list()

    return [
        {
            "id": str(r.id),
            "from_email": r.from_email,
            "from_name": r.from_name,
            "subject": r.subject,
            "preview": (r.body_text or "")[:120],
            "status": r.status,
            "campaign_id": r.campaign_id,
            "queue_item_id": r.queue_item_id,
            "received_at": r.received_at.isoformat(),
        }
        for r in replies
    ]


@router.get("/sent")
async def sent_emails(campaign_id: Optional[str] = None):
    """All emails we sent — for the Sent tab."""
    query: dict = {"status": "sent"}
    if campaign_id:
        query["campaign_id"] = campaign_id

    items = await EmailQueueItem.find(query).sort("-sent_at").limit(300).to_list()

    return [
        {
            "id": str(i.id),
            "to_email": i.lead.email,
            "to_name": i.lead.name,
            "to_company": i.lead.company,
            "subject": i.personalised_subject or "",
            "body": i.personalised_body or "",
            "sent_at": i.sent_at.isoformat() if i.sent_at else None,
            "campaign_id": i.campaign_id,
        }
        for i in items
    ]


@router.get("/{reply_id}")
async def get_reply_thread(reply_id: str):
    """Full thread: the email we sent + their reply."""
    reply = await EmailReply.get(PydanticObjectId(reply_id))
    if not reply:
        raise HTTPException(404, "Reply not found")

    # Mark as read
    if reply.status == "unread":
        await reply.update({"$set": {"status": "read"}})

    # Fetch the original sent email
    sent_item = None
    if reply.queue_item_id:
        try:
            qi = await EmailQueueItem.get(PydanticObjectId(reply.queue_item_id))
            if qi:
                sent_item = {
                    "subject": qi.personalised_subject,
                    "body": qi.personalised_body,
                    "sent_at": qi.sent_at.isoformat() if qi.sent_at else None,
                }
        except Exception:
            pass

    return {
        "reply": {
            "id": str(reply.id),
            "from_email": reply.from_email,
            "from_name": reply.from_name,
            "subject": reply.subject,
            "body_text": reply.body_text,
            "body_html": reply.body_html,
            "received_at": reply.received_at.isoformat(),
            "status": reply.status,
            "our_reply": reply.our_reply,
            "replied_at": reply.replied_at.isoformat() if reply.replied_at else None,
        },
        "sent_item": sent_item,
    }


@router.post("/{reply_id}/respond")
async def respond_to_reply(reply_id: str, data: RespondIn):
    reply = await EmailReply.get(PydanticObjectId(reply_id))
    if not reply:
        raise HTTPException(404, "Reply not found")

    body = data.body

    if data.use_ai:
        # Get original body for context
        orig_body = ""
        if reply.queue_item_id:
            try:
                qi = await EmailQueueItem.get(PydanticObjectId(reply.queue_item_id))
                if qi:
                    orig_body = qi.personalised_body or ""
            except Exception:
                pass
        body = await generate_reply(orig_body, reply.body_text, reply.from_name)

    profile = await UserProfile.get_profile()
    await send_email(
        to_email=reply.from_email,
        to_name=reply.from_name,
        subject=f"Re: {reply.subject}",
        body_text=body,
        signature_html=profile.email_signature_html or "",
    )

    await reply.update({
        "$set": {
            "status": "responded",
            "our_reply": body,
            "replied_at": datetime.now(timezone.utc),
        }
    })

    return {"success": True, "body_sent": body}


@router.post("/poll")
async def trigger_poll(bg: BackgroundTasks):
    bg.add_task(poll_inbox)
    return {"message": "Polling inbox in background"}


@router.get("/poll/run")
async def run_poll_sync():
    """Synchronous poll — for testing."""
    result = await poll_inbox()
    return result