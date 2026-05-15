"""
Email sender — async SMTP via aiosmtplib.
Priority: env vars (.env / Render) → profile SMTP settings.

Port strategy (Render blocks 587 on free tier):
  - Port 465 → SSL/TLS directly (preferred on Render)
  - Port 587 → STARTTLS
  - Port 25  → plain (last resort)
"""
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()


async def _get_smtp_config() -> tuple[str, int, str, str, str, bool]:
    """
    Returns (host, port, user, password, from_name, use_tls).
    Env vars always win. Falls back to profile SMTP if env not set.
    """
    host      = settings.SMTP_HOST     or "smtp.gmail.com"
    port      = settings.SMTP_PORT     or 465        # default to 465 — works on Render
    user      = settings.SMTP_USER     or ""
    password  = settings.SMTP_PASSWORD or ""

    # Fall back to profile SMTP if env not configured
    if not user:
        profile = await UserProfile.get_profile()
        if profile.smtp and profile.smtp.user:
            host     = profile.smtp.host     or host
            port     = profile.smtp.port     or port
            user     = profile.smtp.user
            password = profile.smtp.password

    # Resolve from_name
    from_name = ""
    try:
        profile = await UserProfile.get_profile()
        from_name = profile.full_name or profile.company_name or user
    except Exception:
        from_name = user

    # use_tls = True for 465 (SSL), use STARTTLS for 587
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
    Send a single HTML+plain email.
    Raises on failure so the queue worker can mark the item failed.
    """
    host, port, user, password, from_name, use_ssl = await _get_smtp_config()

    if not user or not password:
        raise ValueError("SMTP credentials not configured — set SMTP_USER and SMTP_PASSWORD in Render env vars")

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"]  = subject
    msg["From"]     = formataddr((from_name, user))
    msg["To"]       = formataddr((to_name or to_email, to_email))
    msg["Reply-To"] = user

    # Plain text
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    # HTML with signature
    body_html = body_text.replace("\n", "<br>")
    full_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:600px;margin:0 auto;padding:20px;">
  <div style="margin-bottom:24px;">{body_html}</div>
  {f'<div style="border-top:1px solid #eee;padding-top:16px;margin-top:16px;">{signature_html}</div>' if signature_html else ''}
</body>
</html>"""
    msg.attach(MIMEText(full_html, "html", "utf-8"))

    # ── Send — port 465 uses SSL directly, port 587 uses STARTTLS ────────────
    if use_ssl:
        # Port 465 — SSL from the start
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            use_tls=True,          # SSL/TLS directly (not STARTTLS)
        )
    else:
        # Port 587 — STARTTLS
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            start_tls=True,
        )


async def test_smtp_connection() -> dict:
    """Test SMTP without sending. Returns {ok, message/error}."""
    try:
        host, port, user, password, from_name, use_ssl = await _get_smtp_config()

        if not user:
            return {"ok": False, "error": "SMTP credentials not configured"}

        smtp = aiosmtplib.SMTP(hostname=host, port=port)

        if use_ssl:
            await smtp.connect(use_tls=True)
        else:
            await smtp.connect()
            await smtp.starttls()

        await smtp.login(user, password)
        await smtp.quit()
        return {"ok": True, "message": f"Connected as {user} on port {port}"}

    except Exception as e:
        return {"ok": False, "error": str(e)}