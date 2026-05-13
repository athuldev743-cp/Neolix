"""
Leads API — Aiven PostgreSQL
Endpoints:
  GET  /leads/search          — full-text search
  POST /leads/single          — add one lead by email
  POST /leads/bulk            — paste raw text, extract emails
  POST /leads/upload          — file upload (CSV/Excel/PDF/TXT/JSON)
  POST /leads/scan            — business card AI extraction
  GET  /leads/{lead_id}       — get one lead
"""
import re
import io
import json
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
import asyncpg

from app.config import get_settings
from app.services.groq_ai import extract_card_details

settings = get_settings()
router = APIRouter(prefix="/leads", tags=["Leads"])

# ── DB connection helper ─────────────────────────────────────────────────────
async def get_conn():
    return await asyncpg.connect(settings.AIVEN_DATABASE_URL, ssl="require")

# ── Ensure table exists ──────────────────────────────────────────────────────
CREATE_SQL = """
CREATE TABLE IF NOT EXISTS leads (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT,
    contact_name  TEXT DEFAULT '',
    company_name  TEXT DEFAULT '',
    phone         TEXT DEFAULT '',
    city          TEXT DEFAULT '',
    state         TEXT DEFAULT '',
    country       TEXT DEFAULT '',
    business_type TEXT DEFAULT '',
    business_details TEXT DEFAULT '',
    source        TEXT DEFAULT 'manual',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);
CREATE INDEX IF NOT EXISTS leads_email_idx     ON leads(email);
CREATE INDEX IF NOT EXISTS leads_company_idx   ON leads(lower(company_name));
CREATE INDEX IF NOT EXISTS leads_city_idx      ON leads(lower(city));
CREATE INDEX IF NOT EXISTS leads_btype_idx     ON leads(lower(business_type));
"""

async def ensure_table():
    conn = await get_conn()
    try:
        for stmt in CREATE_SQL.strip().split(";"):
            s = stmt.strip()
            if s:
                await conn.execute(s)
    finally:
        await conn.close()

# ── Schemas ──────────────────────────────────────────────────────────────────
class SingleLeadIn(BaseModel):
    email: str
    contact_name: str = ""
    company_name: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""
    business_details: str = ""

class BulkLeadIn(BaseModel):
    raw_text: str   # paste dump — emails extracted via regex

class CardLeadIn(BaseModel):
    image_base64: str   # base64 PNG/JPEG of business card

# ── Helpers ──────────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

def extract_emails(text: str) -> list[str]:
    return list({e.lower() for e in EMAIL_RE.findall(text)})

async def upsert_lead(conn, data: dict) -> tuple[int, bool]:
    """Returns (lead_id, already_existed)."""
    row = await conn.fetchrow(
        "SELECT id FROM leads WHERE email = $1", data.get("email", "").lower()
    )
    if row:
        # Update non-empty fields
        sets, vals, idx = [], [], 2
        for k in ("contact_name", "company_name", "phone", "city", "state", "business_details", "business_type", "source"):
            if data.get(k):
                sets.append(f"{k} = ${idx}")
                vals.append(data[k])
                idx += 1
        if sets:
            await conn.execute(
                f"UPDATE leads SET {', '.join(sets)} WHERE id = $1",
                row["id"], *vals
            )
        return row["id"], True

    new = await conn.fetchrow(
        """INSERT INTO leads
           (email, contact_name, company_name, phone, city, state, business_details, business_type, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id""",
        data.get("email", "").lower(),
        data.get("contact_name", ""),
        data.get("company_name", ""),
        data.get("phone", ""),
        data.get("city", ""),
        data.get("state", ""),
        data.get("business_details", ""),
        data.get("business_type", ""),
        data.get("source", "manual"),
    )
    return new["id"], False

# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_leads(
    q: str = Query(..., min_length=1),
    limit: int = Query(50, le=200),
):
    """Full-text search across company_name, city, business_type, email."""
    await ensure_table()
    conn = await get_conn()
    try:
        term = f"%{q.lower()}%"
        rows = await conn.fetch(
            """SELECT id, email, contact_name, company_name, phone, city, state,
                      business_type, business_details
               FROM leads
               WHERE lower(company_name)   ILIKE $1
                  OR lower(city)           ILIKE $1
                  OR lower(business_type)  ILIKE $1
                  OR lower(email)          ILIKE $1
                  OR lower(contact_name)   ILIKE $1
               LIMIT $2""",
            term, limit
        )
        leads = [dict(r) for r in rows]
        return {"leads": leads, "total": len(leads)}
    finally:
        await conn.close()


@router.post("/single")
async def add_single_lead(data: SingleLeadIn):
    if not data.email or "@" not in data.email:
        raise HTTPException(400, "Invalid email address")
    await ensure_table()
    conn = await get_conn()
    try:
        lead_id, existed = await upsert_lead(conn, data.model_dump())
        return {"lead_ids": [lead_id], "already_existed": existed, "total_found": 1}
    finally:
        await conn.close()


@router.post("/bulk")
async def add_bulk_leads(data: BulkLeadIn):
    emails = extract_emails(data.raw_text)
    if not emails:
        raise HTTPException(400, "No valid emails found in text")
    await ensure_table()
    conn = await get_conn()
    try:
        ids = []
        for email in emails:
            lid, _ = await upsert_lead(conn, {"email": email, "source": "bulk_paste"})
            ids.append(lid)
        return {"lead_ids": ids, "total_found": len(ids)}
    finally:
        await conn.close()


@router.post("/upload")
async def upload_leads_file(file: UploadFile = File(...)):
    """Extract leads from CSV/Excel/JSON/TXT/PDF."""
    await ensure_table()
    content = await file.read()
    fname = (file.filename or "").lower()
    leads_raw: list[dict] = []

    try:
        if fname.endswith(".json"):
            items = json.loads(content)
            if isinstance(items, list):
                leads_raw = items
            elif isinstance(items, dict):
                leads_raw = [items]

        elif fname.endswith(".csv") or fname.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
            # Try CSV first
            import csv as csvlib
            try:
                reader = csvlib.DictReader(io.StringIO(text))
                for row in reader:
                    leads_raw.append(dict(row))
            except Exception:
                # plain text — extract emails
                for email in extract_emails(text):
                    leads_raw.append({"email": email})

        elif fname.endswith(".xlsx") or fname.endswith(".xls"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            headers = None
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                vals = [str(v).strip() if v is not None else "" for v in row]
                if i == 0:
                    headers = [v.lower().replace(" ", "_") for v in vals]
                else:
                    leads_raw.append(dict(zip(headers, vals)))

        elif fname.endswith(".pdf"):
            import pdfplumber
            text = ""
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
            for email in extract_emails(text):
                leads_raw.append({"email": email})

        else:
            # generic text extraction
            text = content.decode("utf-8", errors="ignore")
            for email in extract_emails(text):
                leads_raw.append({"email": email})

    except Exception as e:
        raise HTTPException(400, f"File parse error: {str(e)}")

    # Map common column name variants
    FIELD_MAP = {
        "email_address": "email", "e-mail": "email", "mail": "email",
        "name": "contact_name", "full_name": "contact_name", "contact": "contact_name",
        "company": "company_name", "organization": "company_name", "org": "company_name",
        "mobile": "phone", "telephone": "phone", "tel": "phone",
        "type": "business_type", "category": "business_type",
    }

    conn = await get_conn()
    try:
        ids = []
        for raw in leads_raw:
            # normalize keys
            normalized: dict = {}
            for k, v in raw.items():
                key = FIELD_MAP.get(k.lower().strip(), k.lower().strip())
                normalized[key] = str(v).strip() if v else ""

            # must have email
            if not normalized.get("email"):
                # try to find email in values
                for v in normalized.values():
                    if "@" in str(v) and "." in str(v):
                        normalized["email"] = v
                        break

            if not normalized.get("email") or "@" not in normalized["email"]:
                continue

            normalized["source"] = "file_upload"
            lid, _ = await upsert_lead(conn, normalized)
            ids.append(lid)

        return {
            "lead_ids": ids,
            "total_found": len(ids),
            "filename": file.filename,
        }
    finally:
        await conn.close()


@router.post("/scan")
async def scan_business_card(data: CardLeadIn):
    """Use Groq vision-equivalent to extract lead from business card image."""
    extracted = await extract_card_details(data.image_base64)
    if not extracted.get("email"):
        return {"lead_ids": [], "extracted": extracted, "already_existed": False, "total_found": 0}

    await ensure_table()
    conn = await get_conn()
    try:
        extracted["source"] = "card_scan"
        lid, existed = await upsert_lead(conn, extracted)
        return {
            "lead_ids": [lid],
            "extracted": extracted,
            "already_existed": existed,
            "total_found": 1,
        }
    finally:
        await conn.close()


@router.get("/{lead_id}")
async def get_lead(lead_id: int):
    conn = await get_conn()
    try:
        row = await conn.fetchrow("SELECT * FROM leads WHERE id = $1", lead_id)
        if not row:
            raise HTTPException(404, "Lead not found")
        return dict(row)
    finally:
        await conn.close()