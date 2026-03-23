# PARAGRAF — Render deploy notes

## Topologia
- `paragraf-backend` — FastAPI + SQLite + ChromaDB na persistent disk `/var/data`
- `paragraf-frontend` — Next.js

## Dane trwałe
Na persistent disk backendu muszą znaleźć się:
- `/var/data/paragraf.db`
- `/var/data/chromadb/`
- `/var/data/templates/Umowa_B2B_draft_2026_od_02.03.2026.docx`
- opcjonalnie istniejące outputy i backupy w `/var/data/output` oraz `/var/data/backups`

## Co jest zbootstrapowane automatycznie
Przy starcie backend:
- tworzy katalogi na dysku,
- kopiuje bundled template z repo do `/var/data/templates/` jeśli plik jeszcze nie istnieje,
- kopiuje snapshot `paragraf.db` do `/var/data/paragraf.db` jeśli baza jeszcze nie istnieje,
- kopiuje snapshot `chromadb/` do `/var/data/chromadb/` jeśli katalog jest pusty.

## Co trzeba ustawić ręcznie
Żeby mieć pełną funkcjonalność AI/integracji, trzeba ustawić sekrety:
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- opcjonalnie: `PARAGRAF_API_KEY`, `TRAFFIT_API_KEY`

## Sugerowana kolejność
1. Utworzyć usługi z `render.yaml`
2. Poczekać aż backend dostanie disk `/var/data`
3. Ustawić sekrety (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, opcjonalnie inne)
4. Zrestartować backend
5. Zweryfikować `/health`, `/api/usage`, generowanie umowy, legal search

## Uwaga
Frontend został przepięty z hardcoded `localhost` na env + relative `/api`, więc nadaje się do deployu za reverse proxy / publicznym backendem.
