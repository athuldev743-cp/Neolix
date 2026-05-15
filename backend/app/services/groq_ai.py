"""
Groq AI service.
Every function pulls the full user profile from MongoDB and injects it
into the system prompt so generated emails/messages are rich and personalised.
"""
import re
import json
from groq import AsyncGroq
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()


def _client() -> AsyncGroq | None:
    key = settings.GROQAPI_KEY
    return AsyncGroq(api_key=key) if key else None


async def get_profile_context() -> dict:
    """Pull full profile from MongoDB. Called before every AI generation."""
    p = await UserProfile.get_profile()
    return {
        "sender_name":          p.full_name          or "the sender",
        "sender_designation":   p.designation        or "",
        "sender_company":       p.company_name       or "our company",
        "company_tagline":      p.company_tagline    or "",
        "sender_email":         p.email              or "",
        "sender_phone":         p.phone              or "",
        "sender_website":       p.website            or "",
        "preferred_tone":       p.preferred_tone     or "professional",
        "intro_line":           p.intro_line         or "",
        "value_proposition":    p.value_proposition  or "",
        "email_signature_html": p.email_signature_html or "",
    }


def _tone_label(tone: str) -> str:
    return {
        "professional": "professional and confident",
        "friendly":     "warm and friendly",
        "formal":       "formal and precise",
        "casual":       "casual and conversational",
    }.get(tone, "professional and confident")


def _simple_replace(text: str, lead_name: str, lead_company: str) -> str:
    return text \
        .replace("{lead_name}",    lead_name    or "there") \
        .replace("{lead_company}", lead_company or "your company")


# ── Generate fresh template ───────────────────────────────────────────────────
async def generate_email_template(context_hint: str = "") -> tuple[str, str]:
    """
    Generate a subject + body template using full profile context.
    Called when user clicks 'AI generate' on new campaign page.
    Returns (subject, body) with {lead_name} and {lead_company} tokens.
    """
    c = _client()
    ctx = await get_profile_context()

    # Fallback if Groq not configured
    if not c:
        subj = f"Quick question for {{lead_company}}"
        body = (
            f"Hi {{lead_name}},\n\n"
            f"{ctx['intro_line'] or 'I came across {lead_company} and wanted to reach out.'}\n\n"
            f"{ctx['value_proposition'] or 'We help businesses like yours grow.'}\n\n"
            f"Would love to connect for a quick 15-minute call to explore if there's a fit.\n\n"
            f"Best regards,\n{ctx['sender_name']}"
        )
        return subj, body

    system = f"""You are an expert B2B sales email copywriter.
Write a cold outreach email template using the sender's profile context below.

SENDER PROFILE:
- Name: {ctx['sender_name']}
- Title: {ctx['sender_designation']}
- Company: {ctx['sender_company']}
- What we do: {ctx['company_tagline']}
- Value proposition: {ctx['value_proposition']}
- Preferred opening: {ctx['intro_line']}
- Tone: {_tone_label(ctx['preferred_tone'])}
- Website: {ctx['sender_website']}

INSTRUCTIONS:
- Use {{lead_name}} and {{lead_company}} as placeholders for the recipient
- The email body must be 150-220 words — substantial enough to convey value
- Open with the sender's preferred intro line if provided, adapted naturally
- Weave in the value proposition naturally — don't just copy-paste it
- End with a specific, low-friction call to action (quick call, demo, reply)
- Do NOT include a signature — it is appended automatically
- Do NOT use markdown, bullet points, or headers in the body
- Sound like a real human wrote it, not a template
- Context hint from user: {context_hint or 'general cold outreach'}

Return ONLY this exact format, nothing else:
SUBJECT: <subject line>
BODY:
<email body>"""

    try:
        resp = await c.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": f"Write the email template. Context: {context_hint or 'cold outreach to potential business clients'}"},
            ],
            temperature=0.72,
            max_tokens=700,
        )
        text = resp.choices[0].message.content.strip()
        sm = re.search(r"^SUBJECT:\s*(.+)$", text, re.MULTILINE)
        bm = re.search(r"^BODY:\s*\n([\s\S]+)", text, re.MULTILINE)
        subject = sm.group(1).strip() if sm else f"Quick question for {{lead_company}}"
        body    = bm.group(1).strip() if bm else text
        return subject, body
    except Exception as e:
        print(f"[Groq] generate_email_template failed: {e}")
        return (
            f"Quick question for {{lead_company}}",
            f"Hi {{lead_name}},\n\n{ctx['intro_line'] or 'I wanted to reach out regarding {lead_company}.'}\n\n{ctx['value_proposition'] or 'We have something that could help your business grow.'}\n\nWould love a quick 15-minute call.\n\nBest,\n{ctx['sender_name']}"
        )


# ── Personalise existing template for one lead ────────────────────────────────
async def personalise_email(
    subject_template: str,
    body_template: str,
    lead_name: str,
    lead_company: str,
    lead_business_details: str = "",
) -> tuple[str, str]:
    """
    Rewrite a template specifically for one lead using full profile context.
    Returns (personalised_subject, personalised_body).
    """
    # Always do basic token replacement first as fallback
    subject = _simple_replace(subject_template, lead_name, lead_company)
    body    = _simple_replace(body_template,    lead_name, lead_company)

    c = _client()
    if not c:
        return subject, body

    ctx = await get_profile_context()

    system = f"""You are a B2B sales email copywriter.
Rewrite the provided email to be highly personalised for the specific recipient.

SENDER PROFILE:
- Name: {ctx['sender_name']}
- Title: {ctx['sender_designation']}
- Company: {ctx['sender_company']}
- What we do: {ctx['company_tagline']}
- Value proposition: {ctx['value_proposition']}
- Preferred intro: {ctx['intro_line']}
- Tone: {_tone_label(ctx['preferred_tone'])}

RULES:
- Body must be 150-220 words — do not write a short email
- Use the lead's business details naturally if provided — don't invent facts
- Open in a way that shows you know something about their business
- Weave the sender's value proposition into the email naturally
- End with a specific, low-friction call to action
- Do NOT include a signature
- Do NOT use markdown, bullet points, or headers
- Sound human and genuine, not templated

Return ONLY:
SUBJECT: <subject line>
BODY:
<email body>"""

    user_msg = f"""Recipient:
- Name: {lead_name or 'the recipient'}
- Company: {lead_company or 'their company'}
- Business details: {lead_business_details or 'not provided'}

Original subject: {subject_template}
Original body:
{body_template}"""

    try:
        resp = await c.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.7,
            max_tokens=700,
        )
        text = resp.choices[0].message.content.strip()
        sm = re.search(r"^SUBJECT:\s*(.+)$", text, re.MULTILINE)
        bm = re.search(r"^BODY:\s*\n([\s\S]+)", text, re.MULTILINE)
        if sm: subject = sm.group(1).strip()
        if bm: body    = bm.group(1).strip()
    except Exception as e:
        print(f"[Groq] personalise_email failed: {e}")

    return subject, body


# ── Personalise WA message ────────────────────────────────────────────────────
async def personalise_whatsapp(
    template: str,
    lead_name: str,
    lead_company: str,
    lead_business_details: str = "",
) -> str:
    body = _simple_replace(template, lead_name, lead_company)
    c = _client()
    if not c:
        return body

    ctx = await get_profile_context()
    try:
        resp = await c.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Rewrite this WhatsApp message to feel personal and human. "
                        f"Keep it under 100 words. Plain text only, no markdown. "
                        f"Tone: {_tone_label(ctx['preferred_tone'])}. "
                        f"Value we offer: {ctx['value_proposition']}."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Recipient: {lead_name} at {lead_company}.\n"
                        f"Details: {lead_business_details or 'none'}.\n"
                        f"Template:\n{template}"
                    ),
                },
            ],
            temperature=0.75,
            max_tokens=250,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] personalise_whatsapp failed: {e}")
        return body


# ── Generate reply to incoming email ─────────────────────────────────────────
async def generate_reply(
    original_email_body: str,
    incoming_reply_body: str,
    from_name: str,
) -> str:
    c = _client()
    ctx = await get_profile_context()
    if not c:
        return f"Hi {from_name},\n\nThank you for getting back to me! I'd love to connect further.\n\nBest regards,\n{ctx['sender_name']}"

    try:
        resp = await c.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Draft a concise, helpful reply (80-140 words). "
                        f"No signature needed. Tone: {_tone_label(ctx['preferred_tone'])}. "
                        f"Value we offer: {ctx['value_proposition']}."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Our original email:\n{original_email_body}\n\n"
                        f"Their reply:\n{incoming_reply_body}\n\n"
                        f"Write a great follow-up response to {from_name}."
                    ),
                },
            ],
            temperature=0.6,
            max_tokens=350,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] generate_reply failed: {e}")
        return f"Hi {from_name},\n\nThanks for your reply! I'd love to discuss further.\n\nBest regards,\n{ctx['sender_name']}"


# ── Generate WA reply suggestion ──────────────────────────────────────────────
async def generate_wa_reply(
    conversation_history: list[dict],
    from_name: str,
) -> str:
    c = _client()
    ctx = await get_profile_context()
    if not c:
        return f"Hi {from_name}, thanks for reaching out! Let me get back to you shortly."

    try:
        resp = await c.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Reply to this WhatsApp conversation naturally and helpfully. "
                        f"Keep it under 80 words. Plain text, no markdown. "
                        f"Tone: {_tone_label(ctx['preferred_tone'])}."
                    ),
                },
                *conversation_history,
            ],
            temperature=0.65,
            max_tokens=200,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] generate_wa_reply failed: {e}")
        return f"Hi {from_name}, thanks for your message! I'll follow up shortly."


# ── Extract business card details ─────────────────────────────────────────────
async def extract_card_details(image_base64: str) -> dict:
    """Extract contact info from a business card image using Groq vision."""
    c = _client()
    if not c:
        return {}

    prompt = """Extract contact information from this business card image.
Return ONLY a JSON object with these exact keys (empty string if not found):
{
  "email": "",
  "contact_name": "",
  "company_name": "",
  "phone": "",
  "city": "",
  "business_type": "",
  "website": ""
}
Return ONLY the JSON. No explanation, no markdown fences."""

    try:
        resp = await c.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type":      "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=300,
        )
        text = resp.choices[0].message.content.strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Groq] extract_card_details failed: {e}")
        return {}