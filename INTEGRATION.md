# PARAGRAF — Integration Guide

## Telegram (via OpenClaw)

PARAGRAF exposes a chat API that OpenClaw agents can use:

```bash
# Ask a question
curl "http://localhost:8001/api/chat?q=ile+mamy+aktywnych+umow"

# AI-powered search
curl "http://localhost:8001/api/ai-search?q=testerzy+Nordea"

# Get daily report
curl "http://localhost:8001/api/report"

# Get monthly report
curl "http://localhost:8001/api/report/monthly?month=3&year=2026"
```

### OpenClaw Agent Usage

In HEARTBEAT.md or agent code:
```
curl -s http://localhost:8001/api/chat?q=podsumuj+stan+umow
curl -s http://localhost:8001/api/digest
```

## Traffit ATS

Set in `backend/.env`:
```
TRAFFIT_API_KEY=your_key
TRAFFIT_BASE_URL=https://api.traffit.com/v1
```

Then: `POST /api/traffit/sync`

## Microsoft 365 Email

Uses existing MS365 tokens from `~/.secrets/ms365_tokens.json`.
- `GET /api/contracts/{id}/email-preview` — preview welcome email
- `POST /api/contracts/{id}/send-welcome-email` — send via Graph API

## NIP/KRS Lookup

- `GET /api/nip/{nip}` — auto-enrich company data from rejestr.io / KRS

## Exports

- `GET /api/contracts/export/xlsx` — Excel with colored statuses
- `GET /api/contracts/export/csv` — CSV (separator: ;)
- `GET /api/contracts/export/zip` — batch DOCX download

## API Docs

- Swagger UI: http://localhost:8001/docs
- OpenAPI JSON: http://localhost:8001/openapi.json
