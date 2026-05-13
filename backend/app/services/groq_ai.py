"""
Groq AI service.
Uses the user's profile context to personalise emails and WhatsApp messages.
Falls back gracefully if Groq key not set or call fails.
"""
import re
import base64
from groq import AsyncGroq
from app.config import get_settings
from app.models.user_profile import UserProfile

settings = get_settings()


def _get_client() -> AsyncGroq | None:
    key = settings.GROQAPI_KEY
    if not key:
        return None
    return AsyncGroq(api_key=key)


async def get_profile_context() -> dict:
    profile = await UserProfile.get_profile()
    return {
        "sender_name":        profile.full_name,
        "sender_designation": profile.designation,
        "sender_company":     profile.company_name,
        "company_tagline":    profile.company_tagline,
        "sender_email":       profile.email,
        "sender_phone":       profile.phone,
        "sender_website":     profile.website,
        "preferred_tone":     profile.preferred_tone,
        "intro_line":         profile.intro_line,
        "value_proposition":  profile.value_proposition,
        "email_signature_html": profile.email_signature_html,
    }


def _simple_replace(template: str, lead_name: str, lead_company: str) -> str:
    out = template
    out = out.replace("{lead_name}",    lead_name    or "there")
    out = out.replace("{lead_company}", lead_company or "your company")
    return out


async def personalise_email(
    subject_template: str,
    body_template: str,
    lead_name: str,
    lead_company: str,
    lead_business_details: str = "",
) -> tuple[str, str]:
    client = _get_client()
    subject = _simple_replace(subject_template, lead_name, lead_company)
    body    = _simple_replace(body_template,    lead_name, lead_company)
    if not client:
        return subject, body

    ctx = await get_profile_context()
    tone_map = {
        "professional": "professional and confident",
        "friendly":     "warm and friendly",
        "formal":       "formal and precise",
        "casual":       "casual and conversational",
    }
    tone = tone_map.get(ctx.get("preferred_tone", "professional"), "professional and confident")

    system_prompt = f"""You are a sales email copywriter. Rewrite the provided email to be highly personalised for the recipient.

SENDER CONTEXT:
- Name: {ctx['sender_name']}
- Title: {ctx['sender_designation']}
- Company: {ctx['sender_company']}
- What we do: {ctx['company_tagline']}
- Value proposition: {ctx['value_proposition']}
- Intro style: {ctx['intro_line']}
- Tone: {tone}

RULES:
- Keep the email concise (150-220 words for body)
- Do NOT invent facts about the lead's business
- Use the lead's business details naturally if provided
- Do NOT include a signature — that is added separately
- Return ONLY valid output in this exact format:
SUBJECT: <the subject line>
BODY:
<the email body>"""

    user_prompt = f"""Recipient:
- Name: {lead_name or 'the recipient'}
- Company: {lead_company or 'their company'}
- Business details: {lead_business_details or 'not provided'}

Original subject: {subject_template}
Original body:
{body_template}

Rewrite this email for {lead_name or 'them'} at {lead_company or 'their company'}."""

    try:
        resp = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=600,
        )
        text = resp.choices[0].message.content.strip()
        subject_match = re.search(r"^SUBJECT:\s*(.+)$", text, re.MULTILINE)
        body_match    = re.search(r"^BODY:\s*\n([\s\S]+)", text, re.MULTILINE)
        if subject_match: subject = subject_match.group(1).strip()
        if body_match:    body    = body_match.group(1).strip()
    except Exception as e:
        print(f"[Groq] personalise_email failed: {e}")

    return subject, body


async def personalise_whatsapp(
    template: str,
    lead_name: str,
    lead_company: str,
    lead_business_details: str = "",
) -> str:
    """Personalise a WhatsApp message template."""
    client = _get_client()
    body = _simple_replace(template, lead_name, lead_company)
    if not client:
        return body

    ctx = await get_profile_context()
    try:
        resp = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are {ctx['sender_name']} from {ctx['sender_company']}.
Rewrite this WhatsApp outreach message to feel personal and human. Keep it under 100 words.
Tone: {ctx['preferred_tone']}. No markdown. Plain text only. No signature needed.""",
                },
                {
                    "role": "user",
                    "content": f"Recipient: {lead_name} at {lead_company}.\nDetails: {lead_business_details or 'none'}.\nTemplate:\n{template}",
                },
            ],
            temperature=0.75,
            max_tokens=250,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] personalise_whatsapp failed: {e}")
        return body


async def generate_email_template(
    context_hint: str,
    lead_company_placeholder: str = "{lead_company}",
) -> tuple[str, str]:
    client = _get_client()
    if not client:
        return (
            f"Quick question for {lead_company_placeholder}",
            f"Hi {{lead_name}},\n\nI came across {lead_company_placeholder} and wanted to reach out.\n\nWould love to connect for a quick call.\n\nBest regards,"
        )
    ctx = await get_profile_context()
    system_prompt = f"""You are a sales email copywriter. Write a cold outreach email template.

SENDER:
- Name: {ctx['sender_name']}
- Company: {ctx['sender_company']}
- What we do: {ctx['company_tagline']}
- Value prop: {ctx['value_proposition']}
- Tone: {ctx['preferred_tone']}

Use {{lead_name}} and {{lead_company}} as placeholders.
Return ONLY:
SUBJECT: <subject>
BODY:
<body — 120-180 words, no signature>"""

    try:
        resp = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Context hint: {context_hint}"},
            ],
            temperature=0.75,
            max_tokens=500,
        )
        text = resp.choices[0].message.content.strip()
        sm = re.search(r"^SUBJECT:\s*(.+)$", text, re.MULTILINE)
        bm = re.search(r"^BODY:\s*\n([\s\S]+)", text, re.MULTILINE)
        subject = sm.group(1).strip() if sm else f"Quick question for {lead_company_placeholder}"
        body    = bm.group(1).strip() if bm else text
        return subject, body
    except Exception as e:
        print(f"[Groq] generate_email_template failed: {e}")
        return (
            f"Quick question for {lead_company_placeholder}",
            "Hi {lead_name},\n\nI wanted to reach out to {lead_company} about something that could help.\n\nWould love a quick chat."
        )


async def generate_reply(
    original_email_body: str,
    incoming_reply_body: str,
    from_name: str,
) -> str:
    client = _get_client()
    if not client:
        return f"Hi {from_name},\n\nThank you for getting back to me! I'd love to connect further.\n\nBest regards,"
    ctx = await get_profile_context()
    try:
        resp = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": f"You are {ctx['sender_name']} from {ctx['sender_company']}.\nDraft a concise, helpful reply (60-120 words). No signature needed. Match tone: {ctx['preferred_tone']}.",
                },
                {
                    "role": "user",
                    "content": f"Our original email:\n{original_email_body}\n\nTheir reply:\n{incoming_reply_body}\n\nWrite a great response to {from_name}.",
                },
            ],
            temperature=0.6,
            max_tokens=300,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] generate_reply failed: {e}")
        return f"Hi {from_name},\n\nThanks for your reply! Happy to discuss further.\n\nBest regards,"


async def generate_wa_reply(
    conversation_history: list[dict],
    from_name: str,
) -> str:
    """Suggest a reply to an incoming WhatsApp message."""
    client = _get_client()
    if not client:
        return f"Hi {from_name}, thanks for reaching out! Let me get back to you shortly."
    ctx = await get_profile_context()
    try:
        messages = [
            {
                "role": "system",
                "content": f"You are {ctx['sender_name']} from {ctx['sender_company']}. Reply to this WhatsApp conversation naturally. Keep it under 80 words. Plain text, no markdown.",
            }
        ] + conversation_history
        resp = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=messages,
            temperature=0.65,
            max_tokens=200,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] generate_wa_reply failed: {e}")
        return f"Hi {from_name}, thanks for your message! I'll follow up shortly."


async def extract_card_details(image_base64: str) -> dict:
    """
    Extract contact details from a business card image using Groq vision.
    Returns dict with: email, contact_name, company_name, phone, city, business_type
    """
    client = _get_client()
    if not client:
        return {}

    system_prompt = """Extract contact information from this business card image.
Return ONLY a JSON object with these keys (use empty string if not found):
{
  "email": "",
  "contact_name": "",
  "company_name": "",
  "phone": "",
  "city": "",
  "business_type": "",
  "website": ""
}
Return ONLY the JSON. No explanation."""

    try:
        resp = await client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        },
                        {"type": "text", "text": system_prompt},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=300,
        )
        text = resp.choices[0].message.content.strip()
        # strip markdown fences if present
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Groq] extract_card_details failed: {e}")
        return {}


# needed for card extraction
import json