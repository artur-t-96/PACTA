# Progress — PARAGRAF Render deployment

## 2026-03-23
- Start zadania wdrożenia PARAGRAF na Render.
- Potwierdzono, że użytkownik chce deploy z pełnymi danymi.
- Uruchomiono workflow planowania w katalogu projektu.
- Zrobiono audyt kodu pod Render: wykryto hardcoded `localhost` i lokalne ścieżki z Maca.
- Frontend przebudowany pod env + reverse proxy (`/api`, `NEXT_PUBLIC_BACKEND_ORIGIN`).
- Backend przygotowany pod persistent disk `/var/data`.
- Dodano: `render.yaml`, `backend/scripts/render_start.sh`, `RENDER_DEPLOY.md`, bundled template fallback.
- `npm run build` dla frontendu zakończony sukcesem.
- Backend przeszedł kompilację Python (`py_compile`).
