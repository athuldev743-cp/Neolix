"""
Leads API — Aiven PostgreSQL
"""
import re
import io
import json
import ssl
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
import asyncpg
import os
import tempfile

from app.config import get_settings
from app.services.groq_ai import extract_card_details

settings = get_settings()
router = APIRouter(prefix="/leads", tags=["Leads"])

# ── DB connection ─────────────────────────────────────────────────────────────
async def get_conn():
    url = settings.AIVEN_DATABASE_URL
    if not url:
        raise HTTPException(500, "AIVEN_DATABASE_URL not configured")

    clean_url = re.sub(r'[?&](sslmode|application_name|target_session_attrs)=\w+', '', url)
    clean_url = clean_url.rstrip('?')

    ca_cert = os.getenv("AIVEN_CA_CERT")
    ssl_ctx = ssl.create_default_context()

    if ca_cert:
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".pem") as tmp:
            tmp.write(ca_cert)
            tmp_path = tmp.name
        try:
            ssl_ctx.load_verify_locations(cafile=tmp_path)
            ssl_ctx.verify_mode = ssl.CERT_REQUIRED
            ssl_ctx.check_hostname = False
            return await asyncpg.connect(clean_url, ssl=ssl_ctx, timeout=20)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    else:
        ssl_ctx.verify_mode = ssl.CERT_NONE
        return await asyncpg.connect(clean_url, ssl=ssl_ctx, timeout=20)

async def ensure_table():
    conn = await get_conn()
    try:
        # Tables and Columns now match your 'psql' terminal structure
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id           BIGSERIAL PRIMARY KEY,
                email        TEXT UNIQUE,
                contact_name TEXT DEFAULT '',
                company_name TEXT DEFAULT '',
                phone        TEXT DEFAULT '',
                city         TEXT DEFAULT '',
                state        TEXT DEFAULT '',
                country      TEXT DEFAULT '',
                business_type TEXT DEFAULT '',
                business_details TEXT DEFAULT '',
                source       TEXT DEFAULT 'manual',
                created_at   TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    finally:
        await conn.close()


# ── Schemas ───────────────────────────────────────────────────────────────────
class SingleLeadIn(BaseModel):
    email: str
    contact_name: str = ""
    company_name: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""
    business_details: str = ""

class BulkLeadIn(BaseModel):
    raw_text: str

class CardLeadIn(BaseModel):
    image_base64: str

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

def extract_emails(text: str) -> list[str]:
    return list({e.lower() for e in EMAIL_RE.findall(text)})

async def upsert_lead(conn, data: dict) -> tuple[int, bool]:
    email = (data.get("email") or "").lower().strip()
    row = await conn.fetchrow("SELECT id FROM leads WHERE email = $1", email)
    
    # Map 'mobile' to 'phone' if coming from a file upload
    phone_val = data.get("phone") or data.get("mobile") or ""

    if row:
        sets, vals, idx = [], [], 2
        cols = ("contact_name","company_name","city","state","business_details","business_type","source")
        for k in cols:
            if data.get(k):
                sets.append(f"{k} = ${idx}")
                vals.append(data[k])
                idx += 1
        
        # Explicitly handle phone update
        if phone_val:
            sets.append(f"phone = ${idx}")
            vals.append(phone_val)
            idx += 1

        if sets:
            await conn.execute(f"UPDATE leads SET {', '.join(sets)} WHERE id = $1", row["id"], *vals)
        return row["id"], True

    new = await conn.fetchrow(
        """INSERT INTO leads
           (email, contact_name, company_name, phone, city, state, business_details, business_type, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id""",
        email,
        data.get("contact_name",""), data.get("company_name",""),
        phone_val,                  data.get("city",""),
        data.get("state",""),        data.get("business_details",""),
        data.get("business_type",""),data.get("source","manual"),
    )
    return new["id"], False


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/search")
async def search_leads(q: str = Query(..., min_length=1), limit: int = Query(50, le=200)):
    conn = await get_conn()
    try:
        search_term = q.lower().strip()
        
        rows = await conn.fetch(
            """SELECT id, email, contact_name, company_name, phone, business_type
               FROM leads
               WHERE (lower(company_name) || ' ' || COALESCE(lower(business_type), '')) % $1
                  OR lower(company_name) LIKE $2
               ORDER BY 
                  -- 1. Exact matches (e.g., Company is named 'AI')
                  (lower(company_name) = $1) DESC,
                  -- 2. Starts with (e.g., 'AI Traders' vs 'Airtel')
                  (lower(company_name) LIKE $2) DESC,
                  -- 3. Industry similarity (The 'Smart' part)
                  similarity(lower(company_name), $1) DESC
               LIMIT $3""",
            search_term, f"{search_term}%", limit, timeout=20.0
        )
        return {"leads": [dict(r) for r in rows], "total": len(rows)}
    finally:
        await conn.close()


@router.post("/single")
async def add_single_lead(data: SingleLeadIn):
    if not data.email or "@" not in data.email:
        raise HTTPException(400, "Invalid email address")
    await ensure_table()
    conn = await get_conn()
    try:
        lid, existed = await upsert_lead(conn, data.model_dump())
        return {"lead_ids": [lid], "already_existed": existed, "total_found": 1}
    finally:
        await conn.close()


@router.post("/bulk")
async def add_bulk_leads(data: BulkLeadIn):
    emails = extract_emails(data.raw_text)
    if not emails:
        raise HTTPException(400, "No valid emails found")
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
    await ensure_table()
    content = await file.read()
    fname = (file.filename or "").lower()
    leads_raw: list[dict] = []

    try:
        if fname.endswith(".json"):
            items = json.loads(content)
            leads_raw = items if isinstance(items, list) else [items]
        elif fname.endswith(".csv") or fname.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
            import csv as csvlib
            try:
                rows = list(csvlib.DictReader(io.StringIO(text)))
                leads_raw = [dict(r) for r in rows] if rows else [{"email": e} for e in extract_emails(text)]
            except Exception:
                leads_raw = [{"email": e} for e in extract_emails(text)]
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
            leads_raw = [{"email": e} for e in extract_emails(text)]
        else:
            text = content.decode("utf-8", errors="ignore")
            leads_raw = [{"email": e} for e in extract_emails(text)]
    except Exception as e:
        raise HTTPException(400, f"File parse error: {str(e)}")

    FIELD_MAP = {
        "email_address":"email","e-mail":"email","mail":"email",
        "name":"contact_name","full_name":"contact_name","contact":"contact_name",
        "company":"company_name","organization":"company_name","org":"company_name",
        "mobile":"phone","telephone":"phone","tel":"phone",
        "type":"business_type","category":"business_type",
    }
    conn = await get_conn()
    try:
        ids = []
        for raw in leads_raw:
            n: dict = {}
            for k, v in raw.items():
                key = FIELD_MAP.get(k.lower().strip(), k.lower().strip())
                n[key] = str(v).strip() if v else ""
            if not n.get("email"):
                for v in n.values():
                    if "@" in str(v) and "." in str(v):
                        n["email"] = v; break
            if not n.get("email") or "@" not in n["email"]:
                continue
            n["source"] = "file_upload"
            lid, _ = await upsert_lead(conn, n)
            ids.append(lid)
        return {"lead_ids": ids, "total_found": len(ids), "filename": file.filename}
    finally:
        await conn.close()


@router.post("/scan")
async def scan_business_card(data: CardLeadIn):
    extracted = await extract_card_details(data.image_base64)
    if not extracted.get("email"):
        return {"lead_ids": [], "extracted": extracted, "already_existed": False, "total_found": 0}
    await ensure_table()
    conn = await get_conn()
    try:
        extracted["source"] = "card_scan"
        lid, existed = await upsert_lead(conn, extracted)
        return {"lead_ids": [lid], "extracted": extracted, "already_existed": existed, "total_found": 1}
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