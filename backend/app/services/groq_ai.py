"""
Groq AI service — updated to use current supported models.
llama3-70b-8192 was decommissioned — now using llama-3.3-70b-versatile.
"""
import re
import json
from groq import AsyncGroq
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()

# Current supported Groq models (as of 2025)
GROQ_MODEL      = "llama-3.3-70b-versatile"
GROQ_MODEL_FAST = "llama-3.1-8b-instant"


def _client() -> AsyncGroq | None:
    key = settings.GROQAPI_KEY
    return AsyncGroq(api_key=key) if key else None


async def get_profile_context() -> dict:
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


async def generate_email_template(context_hint: str = "") -> tuple[str, str]:
    """Generate subject + body template using full profile context."""
    c = _client()
    ctx = await get_profile_context()

    if not c:
        subj = f"Quick question for {{lead_company}}"
        body = (
            f"Hi {{lead_name}},\n\n"
            f"{ctx['intro_line'] or 'I came across {lead_company} and wanted to reach out.'}\n\n"
            f"{ctx['value_proposition'] or 'We help businesses like yours grow.'}\n\n"
            f"Would love to connect for a quick 15-minute call.\n\n"
            f"Best regards,\n{ctx['sender_name']}"
        )
        return subj, body

    system = f"""You are an expert B2B sales email copywriter.
Write a cold outreach email template using the sender's profile below.

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
- Use {{lead_name}} and {{lead_company}} as placeholders
- Body must be 150-220 words
- Open with sender's preferred intro line, adapted naturally
- Weave in the value proposition naturally
- End with a specific low-friction call to action
- Do NOT include a signature
- No markdown, bullet points, or headers
- Sound like a real human wrote it
- Context hint: {context_hint or 'general cold outreach'}

Return ONLY:
SUBJECT: <subject line>
BODY:
<email body>"""

    try:
        resp = await c.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": f"Write the template. Context: {context_hint or 'cold outreach to business leads'}"},
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
            f"Hi {{lead_name}},\n\n{ctx['intro_line'] or 'I wanted to reach out regarding {lead_company}.'}\n\n{ctx['value_proposition'] or 'We have something that could help your business.'}\n\nWould love a quick 15-minute call.\n\nBest,\n{ctx['sender_name']}"
        )


async def personalise_email(
    subject_template: str,
    body_template: str,
    lead_name: str,
    lead_company: str,
    lead_business_details: str = "",
) -> tuple[str, str]:
    subject = _simple_replace(subject_template, lead_name, lead_company)
    body    = _simple_replace(body_template,    lead_name, lead_company)

    c = _client()
    if not c:
        return subject, body

    ctx = await get_profile_context()

    system = f"""You are a B2B sales email copywriter.
Rewrite the email to be highly personalised for the specific recipient.

SENDER PROFILE:
- Name: {ctx['sender_name']}
- Title: {ctx['sender_designation']}
- Company: {ctx['sender_company']}
- What we do: {ctx['company_tagline']}
- Value proposition: {ctx['value_proposition']}
- Preferred intro: {ctx['intro_line']}
- Tone: {_tone_label(ctx['preferred_tone'])}

RULES:
- Body must be 150-220 words
- Use lead's business details naturally if provided
- Open showing you know something about their business
- Weave value proposition in naturally
- End with specific low-friction call to action
- No signature, no markdown, no bullet points
- Sound human and genuine

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
            model=GROQ_MODEL,
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
            model=GROQ_MODEL_FAST,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Rewrite this WhatsApp message to feel personal and human. "
                        f"Under 100 words. Plain text only, no markdown. "
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


async def generate_reply(
    original_email_body: str,
    incoming_reply_body: str,
    from_name: str,
) -> str:
    c = _client()
    ctx = await get_profile_context()
    if not c:
        return f"Hi {from_name},\n\nThank you for getting back to me!\n\nBest regards,\n{ctx['sender_name']}"

    try:
        resp = await c.chat.completions.create(
            model=GROQ_MODEL_FAST,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Draft a concise helpful reply (80-140 words). "
                        f"No signature. Tone: {_tone_label(ctx['preferred_tone'])}."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Our original email:\n{original_email_body}\n\n"
                        f"Their reply:\n{incoming_reply_body}\n\n"
                        f"Write a great response to {from_name}."
                    ),
                },
            ],
            temperature=0.6,
            max_tokens=350,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] generate_reply failed: {e}")
        return f"Hi {from_name},\n\nThanks for your reply!\n\nBest,\n{ctx['sender_name']}"


async def generate_wa_reply(
    conversation_history: list[dict],
    from_name: str,
) -> str:
    c = _client()
    ctx = await get_profile_context()
    if not c:
        return f"Hi {from_name}, thanks for reaching out!"

    try:
        resp = await c.chat.completions.create(
            model=GROQ_MODEL_FAST,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are {ctx['sender_name']} from {ctx['sender_company']}. "
                        f"Reply naturally. Under 80 words. Plain text, no markdown. "
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
        return f"Hi {from_name}, thanks! I'll follow up shortly."


async def extract_card_details(image_base64: str) -> dict:
    c = _client()
    if not c:
        return {}

    prompt = """Extract contact information from this business card.
Return ONLY a JSON object (no markdown, no explanation):
{"email":"","contact_name":"","company_name":"","phone":"","city":"","business_type":"","website":""}"""

    try:
        resp = await c.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=300,
        )
        text = re.sub(r"```json|```", "", resp.choices[0].message.content.strip()).strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Groq] extract_card_details failed: {e}")
        return {}