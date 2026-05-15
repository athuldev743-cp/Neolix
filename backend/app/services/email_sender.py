import aiosmtplib
import httpx  # For the Resend API call
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()

async def _get_smtp_config() -> tuple[str, int, str, str, str, bool]:
    """
    Returns (host, port, user, password, from_name, use_ssl).
    """
    host      = settings.SMTP_HOST     or "smtp.gmail.com"
    port      = settings.SMTP_PORT     or 465
    user      = settings.SMTP_USER     or ""
    password  = settings.SMTP_PASSWORD or ""

    profile = await UserProfile.get_profile()
    
    # Fall back to profile SMTP if env not configured
    if not user and profile.smtp and profile.smtp.user:
        host     = profile.smtp.host     or host
        port     = profile.smtp.port     or port
        user     = profile.smtp.user
        password = profile.smtp.password

    from_name = profile.full_name or profile.company_name or user
    use_ssl = (port == 465)

    return host, port, user, password, from_name, use_ssl


async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    body_text: str,
    signature_html: str = "",
) -> None:
    """
    Hybrid Sender: Uses Resend API if RESEND_API_KEY exists,
    otherwise falls back to standard SMTP.
    """
    
    # ── STRATEGY 1: RESEND API (Render Friendly) ──────────────────────────
    if settings.RESEND_API_KEY:
        try:
            # We fetch profile to get the correct 'From' name
            profile = await UserProfile.get_profile()
            from_name = profile.full_name or profile.company_name or "OmniAgent AI"
            
            # NOTE: Resend requires a verified domain or 'onboarding@resend.dev'
            from_email = settings.SMTP_USER or "onboarding@resend.dev"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"{from_name} <{from_email}>",
                        "to": [to_email],
                        "subject": subject,
                        "text": body_text,
                        "html": body_text.replace("\n", "<br>") + (f"<br><br>{signature_html}" if signature_html else ""),
                    },
                    timeout=10.0
                )
                if response.status_code in [200, 201]:
                    return # Success!
                else:
                    print(f"Resend API failed ({response.status_code}): {response.text}")
                    # If Resend fails, we let it fall through to SMTP as backup
        except Exception as e:
            print(f"Resend Error: {e}, falling back to SMTP...")

    # ── STRATEGY 2: SMTP (aiosmtplib) ────────────────────────────────────
    host, port, user, password, from_name, use_ssl = await _get_smtp_config()

    if not user or not password:
        raise ValueError("No email credentials found (Resend or SMTP)")

    msg = MIMEMultipart("alternative")
    msg["Subject"]  = subject
    msg["From"]     = formataddr((from_name, user))
    msg["To"]       = formataddr((to_name or to_email, to_email))
    msg["Reply-To"] = user

    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    
    body_html = body_text.replace("\n", "<br>")
    full_html = f"""<html><body style="font-family:sans-serif;">{body_html}
                   {f'<div style="margin-top:20px;border-top:1px solid #eee;">{signature_html}</div>' if signature_html else ''}
                   </body></html>"""
    msg.attach(MIMEText(full_html, "html", "utf-8"))

    if use_ssl:
        await aiosmtplib.send(msg, hostname=host, port=port, username=user, password=password, use_tls=True)
    else:
        await aiosmtplib.send(msg, hostname=host, port=port, username=user, password=password, start_tls=True)


async def test_smtp_connection() -> dict:
    """Tests the preferred connection method."""
    if settings.RESEND_API_KEY:
        return {"ok": True, "message": "Using Resend API (HTTP Port 443)"}
    
    try:
        host, port, user, password, _, use_ssl = await _get_smtp_config()
        smtp = aiosmtplib.SMTP(hostname=host, port=port)
        if use_ssl: await smtp.connect(use_tls=True)
        else: 
            await smtp.connect()
            await smtp.starttls()
        await smtp.login(user, password)
        await smtp.quit()
        return {"ok": True, "message": f"SMTP Connected to {host}:{port}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}