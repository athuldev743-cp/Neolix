# Neolix — B2B Sales Outreach Automation Platform

Neolix is a full-stack outreach automation system that manages multi-channel B2B campaigns (Email, WhatsApp, SMS) across a 9-day contact cadence, with AI-generated, context-aware copywriting for every touchpoint. It's built to run async, at scale, with zero session-state loss under concurrent load.

**Live app:** https://neolix-sage.vercel.app
**Backend API:** FastAPI on Hugging Face Spaces

---

## Why this exists

Manually running multi-touch B2B outreach across email, WhatsApp, and SMS — with each message actually sounding human and referencing real context — doesn't scale past a few dozen leads a day. Neolix automates the full cadence (icebreaker → value drop → soft CTA) across three channels, generates personalized copy per lead using their business context, and handles delivery, replies, and queueing without blocking on any single send.

---

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend   │◄────►│   FastAPI Backend │◄────►│  MongoDB (Aiven) │
│ React+Vite   │      │  (async, Motor)   │      │  Beanie ODM      │
└─────────────┘      └────────┬─────────┘      └─────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
        ┌──────────┐    ┌────────────┐    ┌─────────────┐
        │ Gmail API│    │ Groq LLM   │    │ Android SMS │
        │ (OAuth2) │    │ (Llama 3.3)│    │ Gateway App │
        └──────────┘    └────────────┘    └─────────────┘
```

- **Backend**: FastAPI, fully async request/response and DB access (Motor + Beanie ODM over MongoDB)
- **Background workers**: an in-process async task (`SMSQueueWorker`) runs a continuous jittered send loop so outbound SMS/WhatsApp messages don't hammer providers or block the request cycle
- **AI copy engine**: Groq-hosted Llama 3.3 70B (quality) and Llama 3.1 8B (speed) split by task — full campaign copy uses the larger model, replies and WhatsApp use the fast model to keep latency down
- **Multi-channel delivery**: Gmail API (OAuth2) for email, a custom Android SMS gateway app (React Native) that syncs local SMS logs back to the platform, and a WhatsApp integration
- **Mobile companion app**: React Native Android app that turns a phone into an SMS gateway — sends and logs messages the backend can't send directly

---

## What makes the AI layer non-trivial

Most "AI outreach" tools generate generic, obviously-AI-written copy. Neolix's prompt layer enforces a strict human-writing ruleset on every generation call:

- No corporate buzzwords ("streamline," "leverage," "synergy") — replaced with plain language
- No fake enthusiasm openers ("I hope this finds you well")
- Sentence-length variation enforced in the prompt to avoid the flat, uniform rhythm typical of LLM output
- Industry-aware CTAs — the system maps a lead's industry to an appropriate call-to-action verb (e.g., "Book a table" for restaurants, "Try for free" for SaaS) instead of a generic "Learn more"
- Per-channel constraints — WhatsApp hooks are capped at 3 lines with forced greetings, detailed WhatsApp messages ban greetings entirely, SMS is constrained to 160–300 characters with a deterministic CTA injection as a safety net if the model forgets it

The 9-day cadence itself is context-aware: Day 0 references the original meeting/connection point without pitching, Day 3 drops real product value, Day 6 asks for a low-friction call — each stage has its own prompt instructions rather than one generic "follow-up" template reused three times.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (async) |
| Database | MongoDB (Aiven-hosted), Motor (async driver), Beanie ODM |
| AI / LLM | Groq API — Llama 3.3 70B, Llama 3.1 8B, Llama 3.2 11B Vision (business card OCR) |
| Email | Gmail API, OAuth2 |
| SMS | Custom Android gateway app (React Native + Kotlin native module) |
| Frontend | React, Vite, Tailwind CSS |
| Mobile | React Native (Android) |
| Deployment | Hugging Face Spaces (backend), Vercel (frontend) |
| Logging | Loguru |

---

## Key engineering decisions

- **Async end-to-end**: every DB call, every outbound API call (Gmail, Groq, SMS) is non-blocking. The FastAPI app spawns background tasks (`asyncio.create_task`) for the SMS worker and WhatsApp keepalive loop at startup via the `lifespan` context manager, so these run independently of request handling.
- **Model routing by task cost**: expensive/high-quality generation (full campaign emails) uses Llama 3.3 70B; latency-sensitive tasks (replies, WhatsApp) use the 8B model. This is a deliberate cost/latency tradeoff, not a single-model-for-everything setup.
- **Graceful degradation**: every AI generation function has a deterministic fallback template if the Groq client isn't configured or the API call fails — the system keeps sending messages even if the LLM layer is down.
- **Jittered send loop**: the SMS worker uses randomized timing rather than fixed intervals to avoid carrier-level spam flagging and to smooth load.

---

## Performance

Load-tested `/api/v1/leads/search` (Locust, 5 concurrent users, free-tier Aiven Postgres + free-tier Hugging Face Spaces hosting) to find and fix real bottlenecks rather than assume the code was fast.

**Finding 1 — per-request Postgres connections were the primary bottleneck.**
The search endpoint originally opened a new `asyncpg.connect()` (including a fresh TLS handshake to Aiven) on every single request. Under load this measured:

| Metric | Before (per-request connect) | After (`asyncpg.create_pool`) | Improvement |
|---|---|---|---|
| Median latency | 2700ms | **920ms** | **~66% reduction** |
| P95 latency | 3800ms | 1900ms | ~50% reduction |
| P99 latency | 4000ms | 2700ms | ~33% reduction |
| Failure rate | 0% | 0% | — |

Fix: replaced per-request `asyncpg.connect()`/`close()` with a shared connection pool (`asyncpg.create_pool`, min 2 / max 10 connections) initialized once at app startup and reused across requests.

**Finding 2 — the database itself was never the problem.**
`EXPLAIN ANALYZE` on the underlying full-text search query (GIN-indexed `tsvector` over company name and business type) showed:

```
Execution Time: 0.348 ms
```

Sub-millisecond query execution confirms the GIN index is working correctly. The remaining ~920ms of end-to-end median latency sits outside the database layer — consistent with network round-trip and cold-start/throttling behavior on free-tier Hugging Face Spaces hosting, rather than query or connection-handling performance. This was validated across four separate load test runs with consistent results (890–940ms median each time), ruling out one-off noise.

**Finding 3 — a cross-database dedup bug, found via load testing.**
The search endpoint originally referenced a Postgres table (`outreach_logs`) that never existed in the schema — outreach history is actually tracked in MongoDB, not Postgres. This caused every search request with a dedup filter to fail with a 500. Fixed by querying MongoDB's `OutreachLog` collection directly for the exclusion list instead of a same-database join, matching how the rest of the system's cross-database architecture actually works.

**Known limitation, documented rather than hidden:** the current dedup lookup fetches all `OutreachLog` documents for a given channel on every search call. This is fine at current data volume but won't scale — moving to an indexed query or a cached exclusion set is the next optimization once outreach volume grows (see Roadmap).

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB instance (or Aiven-hosted URL)
- Groq API key
- Gmail API OAuth2 credentials

### Backend

```bash
cd backend/hf_deploy
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill in your own values — see Configuration below
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Configuration

Create `backend/hf_deploy/.env` with:

```
MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=neolix
GROQAPI_KEY=your_groq_api_key
GMAIL_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret
GMAIL_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Project Structure

```
backend/hf_deploy/
├── app/
│   ├── api/v1/          # Route handlers (auth, campaigns, leads, sms, whatsapp...)
│   ├── core/            # DB connection setup
│   ├── models/          # Beanie document models
│   ├── schemas/         # Pydantic request/response schemas
│   └── services/        # Business logic: AI copywriting, email sending, SMS dispatch
├── main.py               # App entrypoint, router mounting, lifespan/background tasks
└── requirements.txt

frontend/
├── src/
│   ├── components/       # Reusable UI (campaign creation, SMS queue table...)
│   ├── pages/             # Route-level pages
│   └── services/api.js    # API client

mobile/                   # React Native Android SMS gateway app
```

---

## Roadmap

- [ ] Add observability (Langfuse) for LLM call tracing and cost tracking per campaign
- [ ] Docker Compose setup for local dev (backend + MongoDB + Redis)
- [ ] Automated eval suite for AI-generated copy quality
- [x] Load-tested performance benchmarks (connection pooling optimization, see Performance section)
- [ ] Move the cross-database dedup lookup (Postgres leads ↔ MongoDB outreach logs) to an indexed query or cached exclusion set as outreach volume grows
- [ ] Migrate off free-tier hosting (Aiven, Hugging Face Spaces) to reduce network/cold-start latency once traffic justifies it

---

## License

Private project — not currently licensed for reuse.