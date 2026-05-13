"""
Profile endpoints — GET and PATCH the single user profile in MongoDB.
Any update immediately affects context injected into future messages.
"""
from fastapi import APIRouter, HTTPException, status
from app.models.user_profile import UserProfile, SMTPConfig, WhatsAppConfig
from app.schemas.profile import ProfileOut, ProfileUpdate, SMTPConfigSchema, WhatsAppConfigSchema

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=ProfileOut, summary="Get user profile")
async def get_profile():
    profile = await UserProfile.get_profile()
    return ProfileOut.from_doc(profile)


@router.patch("", response_model=ProfileOut, summary="Update user profile")
async def update_profile(data: ProfileUpdate):
    profile = await UserProfile.get_profile()

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await profile.save()
    return ProfileOut.from_doc(profile)


@router.put("/smtp", response_model=dict, summary="Update SMTP credentials")
async def update_smtp(data: SMTPConfigSchema):
    profile = await UserProfile.get_profile()
    profile.smtp = SMTPConfig(**data.model_dump())
    await profile.save()
    return {"message": "SMTP settings saved"}


@router.put("/whatsapp", response_model=dict, summary="Update WhatsApp config")
async def update_whatsapp(data: WhatsAppConfigSchema):
    profile = await UserProfile.get_profile()
    profile.whatsapp = WhatsAppConfig(**data.model_dump())
    await profile.save()
    return {"message": "WhatsApp config saved"}


@router.get("/context", summary="Get profile as outreach context (used by AI generator)")
async def get_outreach_context():
    """
    Returns a clean dict of profile fields for injection into AI prompts.
    Called internally by the Outreach Engine (Module 4).
    """
    profile = await UserProfile.get_profile()
    return {
        "sender_name": profile.full_name,
        "sender_designation": profile.designation,
        "sender_company": profile.company_name,
        "company_tagline": profile.company_tagline,
        "sender_email": profile.email,
        "sender_phone": profile.phone,
        "sender_website": profile.website,
        "sender_linkedin": profile.linkedin_url,
        "preferred_tone": profile.preferred_tone,
        "intro_line": profile.intro_line,
        "value_proposition": profile.value_proposition,
        "email_signature_html": profile.email_signature_html,
    }