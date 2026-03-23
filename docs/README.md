# PARAGRAF — AI Contract Management

System zarządzania umowami B2B dla B2B.net S.A.

## Architektura

```
paragraf/
├── backend/          # FastAPI + Python
│   ├── main.py
│   ├── database.py   # SQLite / SQLAlchemy
│   ├── routers/
│   │   └── contracts.py  # Wszystkie endpointy
│   ├── services/
│   │   ├── ai_service.py     # Anthropic Claude
│   │   ├── docx_service.py   # python-docx
│   │   ├── rag_service.py    # ChromaDB + Voyage
│   │   └── contract_numbering.py
│   ├── models/
│   │   └── schemas.py   # Pydantic schemas
│   └── output/contracts/   # Wygenerowane pliki DOCX
│
├── frontend/         # Next.js 16 + Tailwind
│   ├── app/
│   │   ├── page.tsx          # Dashboard
│   │   ├── new/page.tsx      # Formularz nowej umowy
│   │   └── contracts/[id]/
│   │       ├── page.tsx      # Szczegóły + ryzyka
│   │       └── edit/page.tsx # Modyfikacja z diff
│   └── lib/api.ts    # API client
│
└── start.sh          # Start all services
```

## Uruchomienie

```bash
cd ~/clawd/projects/paragraf
./start.sh
```

Lub osobno:

```bash
# Backend
cd backend
ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... python3 -m uvicorn main:app --port 8001 --reload

# Frontend
cd frontend
PORT=3002 npm run dev
```

## Endpointy API

### POST /api/contracts/generate
Generuje umowę B2B z szablonu DOCX.

```json
{
  "imie": "Jan",
  "nazwisko": "Kowalski",
  "firma": "JK Software Jan Kowalski",
  "nip": "1234567890",
  "regon": "123456789",
  "adres": "ul. Testowa 1, 00-001 Warszawa",
  "email": "jan@firma.pl",
  "tel": "+48 600 100 200",
  "rola": "Senior Backend Developer",
  "stawka": 200.0,
  "klient": "Nordea Bank Polska S.A.",
  "data_startu": "2026-04-01",
  "obszar_it": "Java Spring Cloud",
  "opis_projektu": "Rozwój systemu bankowego",
  "miasto_klienta": "Warszawa"
}
```

### POST /api/contracts/modify
Modyfikuje paragrafy umowy przez AI.

```json
{
  "contract_id": 1,
  "zmiany": [
    {"paragraf": "§10 ust.1", "zmiana": "zmień 12 na 6 miesięcy"}
  ]
}
```

### POST /api/contracts/check-risks
Sprawdza ryzyka prawne zmian (RAG + AI).

```json
{
  "contract_id": 1,
  "zmiany": [
    {"paragraf": "§8", "zmiana": "usuń poufność"}
  ]
}
```
Odpowiedź: `{risks: [{ryzyko: "red|yellow|green", uzasadnienie: "..."}]}`

### GET /api/contracts — lista umów
### GET /api/contracts/{id} — szczegóły
### GET /api/contracts/{id}/download — pobierz DOCX

## Dane B2B.net (hardcoded)
- **Firma:** B2B.net S.A., Al. Jerozolimskie 180, 02-486 Warszawa
- **KRS:** 0000387063, **NIP:** 5711707392
- **Prezes:** Artur Twardowski
- **IOD:** iod@b2bnetwork.pl

## Numery umów
Format: `XXX/YYYY` (np. `001/2026`), inkrementalny per rok.

## Szablon umowy
Plik: `~/clawd/data/legal/marta_templates/Umowa_B2B_(draft_2026)od_02.03.2026.docx`

Zawiera:
- Umowa główna (§1–§12)
- Załącznik 1: Deklaracja Poufności
- Załącznik 2: DPA (Umowa Powierzenia Danych)
- Załącznik 3: Klient Projektu (tabela)

## ChromaDB (RAG)
Kolekcja `legal_pl` w `~/clawd/data/chromadb/`. 
Zasilić przepisami KP, RODO, KC dla lepszej analizy ryzyk.
