"""
Email sender — Gmail API via OAuth2.
Uses HTTPS (port 443) — works on HF Space, Render, everywhere.
No SMTP port restrictions.

Required env vars:
  GMAIL_CLIENT_ID
  GMAIL_CLIENT_SECRET
  GMAIL_REFRESH_TOKEN
  GMAIL_SENDER        (your gmail address)
"""
import base64
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL   = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


async def _get_access_token() -> str:
    """Exchange refresh token for a fresh access token."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id":     settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type":    "refresh_token",
            },
        )
    data = resp.json()
    if "access_token" not in data:
        raise ValueError(f"Failed to get access token: {data}")
    return data["access_token"]


async def _get_sender_info() -> tuple[str, str, str]:
    """Returns (from_email, from_name, signature_html)."""
    profile    = await UserProfile.get_profile()
    from_email = settings.GMAIL_SENDER or profile.email or ""
    from_name  = profile.full_name or profile.company_name or from_email
    signature  = profile.email_signature_html or ""
    return from_email, from_name, signature


async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    body_text: str,
    signature_html: str = "",
) -> None:
    """Send email via Gmail API. Raises on failure."""
    if not settings.GMAIL_CLIENT_ID:
        raise ValueError("Gmail API not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER in secrets.")

    from_email, from_name, profile_sig = await _get_sender_info()
    if not from_email:
        raise ValueError("GMAIL_SENDER not set in HF Space secrets.")

    sig = signature_html or profile_sig

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{from_name} <{from_email}>"
    msg["To"]      = f"{to_name} <{to_email}>" if to_name else to_email

    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    body_html = body_text.replace("\n", "<br>")
    full_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:600px;margin:0 auto;padding:20px;">
  <div style="margin-bottom:24px;">{body_html}</div>
  {f'<div style="border-top:1px solid #eee;padding-top:16px;margin-top:16px;">{sig}</div>' if sig else ''}
</body>
</html>"""
    msg.attach(MIMEText(full_html, "html", "utf-8"))

    # Encode as base64url for Gmail API
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    # Get fresh access token
    access_token = await _get_access_token()

    # Send via Gmail API
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GMAIL_SEND_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type":  "application/json",
            },
            json={"raw": raw},
        )

    if resp.status_code not in (200, 201):
        err = resp.json() if "application/json" in resp.headers.get("content-type", "") else resp.text
        raise ValueError(f"Gmail API error {resp.status_code}: {err}")


async def test_smtp_connection() -> dict:
    """Test Gmail API credentials — called from Settings → Test connection."""
    if not settings.GMAIL_CLIENT_ID:
        return {"ok": False, "error": "Gmail API credentials not configured in HF Space secrets"}

    try:
        access_token = await _get_access_token()

        # Test by fetching Gmail profile
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if resp.status_code == 200:
            data = resp.json()
            return {
                "ok": True,
                "message": f"Gmail API connected. Sending from: {data.get('emailAddress', settings.GMAIL_SENDER)}"
            }
        else:
            return {"ok": False, "error": f"Gmail API returned {resp.status_code}: {resp.text}"}

    except Exception as e:
        return {"ok": False, "error": str(e)}