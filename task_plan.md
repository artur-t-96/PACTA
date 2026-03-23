# Plan wdrożenia PARAGRAF na Render

## Cel
Wypuścić PARAGRAF na Render z pełnymi danymi produkcyjnymi, backendem, frontendem i trwałym storage/configiem, tak aby aplikacja działała zdalnie bez utraty danych.

## Fazy
- [complete] 1. Audyt stanu projektu i wymagań deploymentu
- [complete] 2. Weryfikacja strategii danych i storage na Render
- [complete] 3. Przygotowanie konfiguracji deploymentu
- [pending] 4. Wdrożenie usług na Render
- [pending] 5. Walidacja po wdrożeniu i smoke test
- [in_progress] 6. Dokumentacja i handoff

## Decyzje
- Użytkownik chce wdrożenie "ze wszystkimi danymi", więc trzeba potraktować bazę i pliki jako produkcyjne assety, a nie pusty seed.
- Priorytet: najpierw sprawdzić obecny kształt aplikacji i kompatybilność z Render, potem dopiero deploy.

## Ryzyka
- SQLite na Render bez persistent disk = utrata danych przy restarcie/deployu.
- Możliwe zależności od lokalnych ścieżek/pliki DOCX/output.
- Możliwe wymagane sekrety/API keys w backend/.env.
- Może być potrzebne zalogowanie do Render lub autoryzacja po stronie użytkownika.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| None yet | 0 | N/A |
