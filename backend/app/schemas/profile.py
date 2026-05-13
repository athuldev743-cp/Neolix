from typing import Optional
from pydantic import BaseModel


class SMTPConfigSchema(BaseModel):
    host: str = ""
    port: int = 587
    user: str = ""
    password: str = ""
    from_name: str = ""
    use_tls: bool = True


class SMTPConfigSafeOut(BaseModel):
    """Never expose password in GET responses."""
    host: str = ""
    port: int = 587
    user: str = ""
    from_name: str = ""
    use_tls: bool = True
    has_password: bool = False


class WhatsAppConfigSchema(BaseModel):
    phone_number: str = ""
    session_id: str = ""
    status: str = "disconnected"
    qr_code: str = ""


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    company_name: Optional[str] = None
    company_tagline: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    linkedin_url: Optional[str] = None
    email_signature_html: Optional[str] = None
    preferred_tone: Optional[str] = None
    intro_line: Optional[str] = None
    value_proposition: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileOut(BaseModel):
    full_name: str
    designation: str
    company_name: str
    company_tagline: str
    industry: str
    website: str
    email: str
    phone: str
    city: str
    country: str
    linkedin_url: str
    email_signature_html: str
    preferred_tone: str
    intro_line: str
    value_proposition: str
    avatar_url: str
    smtp: SMTPConfigSafeOut
    whatsapp: WhatsAppConfigSchema

    @classmethod
    def from_doc(cls, doc) -> "ProfileOut":
        smtp_safe = SMTPConfigSafeOut(
            host=doc.smtp.host,
            port=doc.smtp.port,
            user=doc.smtp.user,
            from_name=doc.smtp.from_name,
            use_tls=doc.smtp.use_tls,
            has_password=bool(doc.smtp.password),
        )
        return cls(
            full_name=doc.full_name,
            designation=doc.designation,
            company_name=doc.company_name,
            company_tagline=doc.company_tagline,
            industry=doc.industry,
            website=doc.website,
            email=doc.email,
            phone=doc.phone,
            city=doc.city,
            country=doc.country,
            linkedin_url=doc.linkedin_url,
            email_signature_html=doc.email_signature_html,
            preferred_tone=doc.preferred_tone,
            intro_line=doc.intro_line,
            value_proposition=doc.value_proposition,
            avatar_url=doc.avatar_url,
            smtp=smtp_safe,
            whatsapp=WhatsAppConfigSchema(
                phone_number=doc.whatsapp.phone_number,
                session_id=doc.whatsapp.session_id,
                status=doc.whatsapp.status,
                qr_code=doc.whatsapp.qr_code,
            ),
        )