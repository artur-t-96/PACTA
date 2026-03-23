# ⚖️ PARAGRAF v6.6 — AI Contract Management

System zarządzania umowami B2B dla B2B.net S.A.

## Quick Start

```bash
# Backend (port 8001)
cd backend && cp .env.example .env  # fill in API keys
pip install -r requirements.txt
python3 -m uvicorn main:app --port 8001 --reload

# Frontend (port 3002)
cd frontend && npm install
PORT=3002 npm run dev

# Or use Makefile:
make dev
```

## Architecture

```
backend/
├── main.py              # App entry, middleware, standalone endpoints (250 lines)
├── database.py           # SQLAlchemy models (Contract, AuditLog)
├── routers/
│   ├── contracts.py      # CRUD, generate, modify, risks, annex, terminate
│   ├── analytics.py      # 20 analytics endpoints
│   ├── exports.py        # CSV, XLSX, ZIP, per-client
│   ├── ai.py             # AI search, chat, generate, recommend
│   └── system.py         # Templates, clauses, backup, import, NIP lookup
├── services/
│   ├── ai_service.py     # Claude Haiku/Sonnet integration
│   ├── annex_service.py  # DOCX annex generation
│   ├── benchmark_service.py  # Market rate comparison
│   ├── clause_library.py # Standard contract clauses
│   ├── docx_service.py   # python-docx contract generation
│   ├── email_service.py  # Welcome email templates
│   ├── html_service.py   # DOCX→HTML conversion
│   ├── import_service.py # Excel import
│   ├── negotiation_service.py  # Rate recommendation
│   ├── notification_service.py # Alerts, digest, renewals
│   ├── quality_service.py # Data quality checks
│   ├── rag_service.py    # ChromaDB + Voyage AI
│   ├── regon_service.py  # NIP/KRS lookup
│   ├── template_service.py # DOCX template management
│   ├── termination_service.py # Termination agreements
│   └── traffit_service.py # ATS integration (stub)
├── middleware/
│   ├── rate_limit.py     # 20 AI / 100 general per minute
│   └── sanitize.py       # XSS, SQL injection prevention
└── tests/
    ├── test_api.py       # 20 core tests
    ├── test_advanced.py  # 17 advanced tests
    ├── test_contracts.py # 6 integration tests
    └── test_workflow.py  # 2 e2e lifecycle tests

frontend/
├── app/
│   ├── page.tsx          # Dashboard (KPI, table, pagination, sorting)
│   ├── new/              # Generate contract form
│   ├── quick/            # AI quick generate (NL → contract)
│   ├── contracts/[id]/   # Detail, edit, annex, print
│   ├── analytics/        # Year trends, top roles, recruiters
│   ├── insights/         # Seasonality, velocity, duplicates
│   ├── benchmark/        # Rate vs market comparison
│   ├── ceo/              # CEO dashboard
│   ├── recruiter/        # Recruiter quick panel
│   ├── legal/            # RAG legal search
│   ├── clauses/          # Clause library
│   ├── search/           # Global search
│   ├── compare/          # Side-by-side contract diff
│   ├── alerts/           # Data quality alerts
│   ├── enrichment/       # Bulk rate suggestions
│   ├── contractor/[name]/ # Contractor profile
│   ├── stats/            # Statistics
│   ├── settings/         # System settings
│   ├── import/           # Excel import UI
│   └── docs/             # API docs browser
└── lib/api.ts            # API client
```

## Key Features

### Contract Management
- Generate B2B contracts from Word template (auto-fill placeholders)
- Modify paragraphs with AI (Claude Sonnet)
- Generate annexes (rate change, role change, termination)
- Status workflow: draft → do_podpisu → aktywna → zakończona
- Pre-sign validation (NIP, email, rate, DOCX required)
- Onboarding checklist (7 steps)

### AI Features
- **Full Contract Review** — Sonnet analyzes entire DOCX, score 1-10
- **Risk Assessment** — RAG + AI for legal risk analysis
- **AI Search** — "wszyscy testerzy w Nordea" → natural language
- **Quick Generate** — describe contract in Polish → AI extracts fields
- **Chat** — ask questions about contracts in natural language
- **Rate Recommendation** — AI suggests optimal rate with leverage scoring

### Analytics
- 20+ analytics endpoints (seasonal, aging, velocity, duplicates, etc.)
- Portfolio value calculator (annual revenue estimate)
- Rate benchmarks vs market (No Fluff Jobs, JustJoinIT 2024-2025)
- Recruiter performance stats
- KSeF readiness check
- Contract similarity search

### Data
- **1000+ contracts** (historical import from Excel + new)
- **158 RAG legal chunks** (KC, KP, RODO, KSeF)
- **8 standard clauses** with risk levels
- **65+ unique clients** (Nordea 47%, BNP 11%)

## Deployment

```bash
# Docker
docker-compose up -d

# Makefile
make dev        # Start both
make test       # Run 45 tests
make build      # Production frontend build
make backup     # Database backup
make check      # Daily health check
make stats      # Show current stats
```

## API

**94 endpoints** organized in 5 groups:
- `/api/contracts/*` — CRUD, generate, modify, risks
- `/api/analytics/*` — 20 analytics endpoints
- `/api/contracts/export/*` — CSV, XLSX, ZIP
- `/api/ai/*` — search, chat, generate, recommend
- `/api/*` — system, templates, clauses, lookup

Swagger UI: http://localhost:8001/docs

## Stack
- Backend: FastAPI 6.6 + SQLAlchemy + SQLite + python-docx
- Frontend: Next.js 16 + Tailwind CSS + TypeScript
- AI: Claude Haiku (fast) + Sonnet (legal) via Anthropic API
- RAG: Voyage AI voyage-3-lite + ChromaDB (158 chunks)
- Market data: No Fluff Jobs, JustJoinIT 2024-2025

## Tests
```bash
make test       # 45 tests, ALL PASS
make test-quick # 37 quick tests
```
