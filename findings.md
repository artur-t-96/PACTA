# Findings — PARAGRAF Render deployment

## Session start
- Cel: wdrożyć istniejący PARAGRAF na Render z kompletem danych.
- Aktualny lokalny stan: backend działa na 8001, frontend na 3002.
- Lokalna baza backendu: `backend/paragraf.db`.
- Projekt zawiera `docker-compose.yml`, `Makefile`, backend FastAPI i frontend Next.js.

## Hipotezy do weryfikacji
- Czy deploy powinien być jako dwa serwisy na Render: backend + frontend.
- Czy baza SQLite i pliki output/backups/data muszą być na persistent disk.
- Czy frontend może wskazywać na publiczny backend URL przez env.
- Czy wygodniej użyć render.yaml czy ręcznego tworzenia usług.

## Ustalenia
- Docelowa architektura Render: 2 web services (`paragraf-backend`, `paragraf-frontend`).
- Backend wymaga persistent disk na `/var/data` dla: SQLite, ChromaDB, templates, backupów i outputów.
- Frontend został przepięty z hardcoded `localhost` na `NEXT_PUBLIC_BACKEND_ORIGIN` + relative `/api`.
- Dodano `render.yaml`, startup script backendu i dokument deployu.
- Lokalny template został skopiowany do repo (`backend/templates/...`) jako fallback bootstrap przy pierwszym starcie.
- Nadal potrzebny jest kanał wdrożeniowy do Rendera.
- Pełne dane startowe zostały spakowane do repo jako bootstrap (`backend/bootstrap/paragraf.db` + `backend/bootstrap/chromadb/`), więc Render może wstać z pełnym snapshotem bez ręcznego uploadu danych przy pierwszym deployu.
