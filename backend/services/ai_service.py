"""
AI Service — Anthropic Claude integration

Model strategy:
- Haiku: fast, cheap tasks (IT area standardization, simple formatting)
- Sonnet: complex legal tasks (paragraph modification, risk assessment)
- Opus: reserved for V2 (full contract review, strategic decisions)
"""
import os
import re
import json
import time
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Simple in-memory cache for repeated standardizations
_it_area_cache: dict = {}

# Track API usage per session
_api_usage = {"calls": 0, "input_tokens": 0, "output_tokens": 0}


def get_usage() -> dict:
    """Return API usage stats."""
    return dict(_api_usage)


def _track_usage(response):
    """Track token usage from API response."""
    _api_usage["calls"] += 1
    if hasattr(response, "usage"):
        _api_usage["input_tokens"] += getattr(response.usage, "input_tokens", 0)
        _api_usage["output_tokens"] += getattr(response.usage, "output_tokens", 0)

IT_AREAS = [
    "Software Development",
    "QA",
    "DevOps",
    "Data & Analytics",
    "Cloud Solutions",
    "Test Automation",
]


def standardize_it_area(obszar_it: str) -> str:
    """Use Haiku to standardize the IT area to one of the defined categories. Cached."""
    # Check cache first
    normalized = obszar_it.lower().strip()
    if normalized in _it_area_cache:
        return _it_area_cache[normalized]
    
    # Simple keyword matching before calling AI (faster & cheaper)
    keyword_map = {
        ("devops", "ci/cd", "kubernetes", "docker", "jenkins", "helm"): "DevOps",
        ("cloud", "aws", "azure", "gcp", "terraform"): "Cloud Solutions",
        ("analityk", "anali", "data", "analytics", "etl", "snowflake", "dbt", "spark", "hadoop", "warehouse", "hurtowni"): "Data & Analytics",
        ("qa", "quality", "test", "selenium", "cypress", "playwright", "automation"): "Test Automation",
        ("java", "python", "react", "angular", "node", "backend", "frontend", "fullstack", "develop"): "Software Development",
    }
    
    for keywords, area in keyword_map.items():
        if any(kw in normalized for kw in keywords):
            _it_area_cache[normalized] = area
            return area
    
    # Fallback to Haiku for ambiguous cases
    prompt = f"""Masz następujące kategorie obszarów IT:
{chr(10).join(f'- {a}' for a in IT_AREAS)}

Użytkownik podał: "{obszar_it}"

Przypisz DOKŁADNIE jedną kategorię z listy powyżej. Odpowiedz TYLKO nazwą kategorii, nic więcej."""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=50,
        messages=[{"role": "user", "content": prompt}],
    )
    _track_usage(msg)
    result = msg.content[0].text.strip()
    for area in IT_AREAS:
        if area.lower() in result.lower():
            _it_area_cache[normalized] = area
            return area
    
    _it_area_cache[normalized] = IT_AREAS[0]
    return IT_AREAS[0]


def modify_paragraph_text(original_text: str, zmiana: str, paragraf: str) -> str:
    """Use AI to modify a paragraph according to the change request."""
    prompt = f"""Jesteś prawnikiem specjalizującym się w umowach B2B. 
    
Masz następujący fragment umowy ({paragraf}):
---
{original_text}
---

Wprowadź następującą zmianę: {zmiana}

Zwróć TYLKO zmodyfikowany tekst, bez komentarzy, bez cudzysłowów, bez markdown. Zachowaj polskie formułowania prawnicze."""

    # Paragraph modification uses Sonnet — legal text requires precision
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    _track_usage(msg)
    return msg.content[0].text.strip()


def assess_legal_risk(paragraf: str, zmiana: str, legal_context: str = "") -> dict:
    """Use AI to assess legal risk of a contract change."""
    context_section = f"\nRelevantne przepisy prawne:\n{legal_context}\n" if legal_context else ""

    prompt = f"""Jesteś prawnikiem specjalizującym się w prawie pracy i umowach B2B w Polsce.
{context_section}
Oceń ryzyko prawne następującej zmiany w umowie B2B:

Paragraf: {paragraf}
Proponowana zmiana: {zmiana}

Odpowiedz w formacie JSON:
{{
  "ryzyko": "green|yellow|red",
  "uzasadnienie": "krótkie uzasadnienie po polsku (max 200 znaków)",
  "przepisy": ["lista relewantnych przepisów, np. art. 22 KP, RODO art. 28"]
}}

Kryteria:
- green: zmiana standardowa, niskie ryzyko
- yellow: potencjalne ryzyka, wymaga przeglądu
- red: wysokie ryzyko prawne, naruszenie przepisów"""

    # Risk assessment uses Sonnet — more critical than standardization
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    _track_usage(msg)

    text = msg.content[0].text.strip()
    # Extract JSON
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {
        "ryzyko": "yellow",
        "uzasadnienie": "Nie można ocenić ryzyka automatycznie. Wymaga ręcznej weryfikacji.",
        "przepisy": [],
    }


def full_contract_review(contract_text: str, contractor_name: str, client_name: str) -> dict:
    """
    Full AI review of a contract — uses Sonnet for deeper analysis.
    Checks: balance of obligations, unusual clauses, missing provisions, risk areas.
    """
    prompt = f"""Jesteś prawnikiem specjalizującym się w umowach B2B IT w Polsce.

Przeanalizuj poniższą umowę B2B między B2B.net S.A. a {contractor_name} (klient końcowy: {client_name}).

TREŚĆ UMOWY:
---
{contract_text[:8000]}
---

Wykonaj pełną analizę:
1. **Klauzule ryzykowne** — co może być problematyczne
2. **Brakujące postanowienia** — czego brakuje vs standard rynkowy
3. **Niezbalansowane obowiązki** — czy jedna strona jest uprzywilejowana
4. **Zgodność z prawem** — czy coś narusza KC, KP, RODO
5. **Rekomendacje** — co zmienić/dodać

Odpowiedz w formacie JSON:
{{
  "overall_score": 1-10,
  "overall_assessment": "krótka ocena 1-2 zdania",
  "risky_clauses": [
    {{"paragraf": "§X", "ryzyko": "green|yellow|red", "opis": "...", "rekomendacja": "..."}}
  ],
  "missing_provisions": ["lista brakujących postanowień"],
  "recommendations": ["lista rekomendacji"],
  "legal_compliance": "green|yellow|red"
}}"""

    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    _track_usage(msg)
    
    text = msg.content[0].text.strip()
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    return {
        "overall_score": 0,
        "overall_assessment": "Nie udało się przeprowadzić automatycznej analizy",
        "risky_clauses": [],
        "missing_provisions": [],
        "recommendations": [],
        "error": text[:500],
    }
