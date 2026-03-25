"""
AI Assistant router — multi-turn conversational AI for operators.
Supports: contract generation, clause review, risk assessment, paragraph modification.
"""
import os
import re
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

import anthropic
from database import get_db, Contract, Ticket

router = APIRouter()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class AssistantRequest(BaseModel):
    messages: List[ChatMessage]
    ticket_id: Optional[int] = None
    context_type: Optional[str] = None  # "generate_contract", "check_risks", "modify_paragraph"

class AssistantResponse(BaseModel):
    reply: str
    action: Optional[dict] = None  # structured action if AI decides to do something
    context_used: Optional[str] = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_contract_stats(db: Session) -> str:
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    avg_rate = db.query(func.avg(Contract.rate)).filter(
        Contract.rate > 0, ~Contract.number.startswith("H-")
    ).scalar() or 0

    top_clients = db.query(
        Contract.client, func.count(Contract.id)
    ).group_by(Contract.client).order_by(func.count(Contract.id).desc()).limit(5).all()

    top_areas = db.query(
        Contract.it_area, func.count(Contract.id)
    ).group_by(Contract.it_area).order_by(func.count(Contract.id).desc()).limit(5).all()

    return f"""Statystyki umów B2B.net S.A.:
- Łącznie umów: {total}
- Aktywnych: {active}
- Średnia stawka (nowe): {round(float(avg_rate), 2)} PLN/h
- Top klienci: {', '.join(f'{c} ({n})' for c, n in top_clients)}
- Top obszary IT: {', '.join(f'{a} ({n})' for a, n in top_areas)}"""
def _build_ticket_context(db: Session, ticket_id: int) -> str:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return ""

    details = {}
    if ticket.details:
        try:
            details = json.loads(ticket.details) if isinstance(ticket.details, str) else ticket.details
        except:
            details = {}

    lines = [
        f"Typ zgłoszenia: {ticket.type}",
        f"Tytuł: {ticket.title}",
        f"Status: {ticket.status}",
        f"Zgłoszone przez: {ticket.requester_id}",
    ]
    if details:
        lines.append("Szczegóły zlecenia:")
        for k, v in details.items():
            if v:
                lines.append(f"  - {k.replace('_', ' ')}: {v}")

    return "\n".join(lines)


def _get_legal_context(query: str) -> str:
    """Search RAG for relevant legal provisions."""
    try:
        from services.rag_service import search_legal_context
        results = search_legal_context(query, n_results=3)
        if results:
            return "Relewantne przepisy prawne:\n" + "\n---\n".join(results)
    except:
        pass
    return ""
SYSTEM_PROMPT = """Jesteś asystentem AI systemu PARAGRAF — platformy do zarządzania umowami B2B dla B2B.net S.A.

Twoja rola: pomagasz operatorom (np. Marta) w:
1. **Generowaniu umów B2B** — zbierasz dane od operatora, walidujesz je, i przygotowujesz do wygenerowania umowy
2. **Weryfikacji ryzyk prawnych** — analizujesz zapisy umowy i oceniasz ryzyka (green/yellow/red)
3. **Modyfikacji paragrafów** — proponujesz zmiany w konkretnych paragrafach umowy
4. **Odpowiadaniu na pytania** — o umowach, przepisach prawnych, statystykach

Zasady:
- Odpowiadaj ZAWSZE po polsku
- Bądź konkretny i rzeczowy — operatorzy cenią zwięzłość
- Gdy zbierasz dane do umowy, pytaj o brakujące pola jedno po drugim
- Gdy analizujesz ryzyko, podaj ocenę (green/yellow/red) z uzasadnieniem
- Odwołuj się do polskiego prawa (KC, KP, RODO, KSeF) gdy to stosowne
- Formatuj odpowiedzi czytelnie — używaj pogrubienia i list gdy potrzeba

Gdy masz wystarczające dane do wygenerowania umowy, zwróć na końcu odpowiedzi blok JSON w formacie:
```action
{"type": "generate_contract", "data": {"imie": "...", "nazwisko": "...", "firma": "...", "nip": "...", "adres": "...", "email": "...", "tel": "...", "rola": "...", "stawka": 0, "klient": "...", "data_startu": "YYYY-MM-DD", "obszar_it": "...", "miasto_klienta": "...", "opis_projektu": "..."}}
```

Gdy oceniasz ryzyko paragrafu, zwróć:
```action
{"type": "risk_assessment", "data": {"paragraf": "§X", "zmiana": "opis zmiany", "ryzyko": "green|yellow|red", "uzasadnienie": "...", "przepisy": ["art. X KC"]}}
```

Gdy proponujesz modyfikację paragrafu:
```action
{"type": "modify_paragraph", "data": {"contract_id": 0, "paragraf": "§X", "original": "oryginalny tekst", "modified": "zmodyfikowany tekst", "uzasadnienie": "dlaczego ta zmiana"}}
```

Nie wymuszaj akcji — najpierw zbierz potrzebne dane i dopiero wtedy zaproponuj akcję."""
# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/assistant", response_model=AssistantResponse)
def ai_assistant(req: AssistantRequest, db: Session = Depends(get_db)):
    """Multi-turn AI assistant for operators."""

    # Build context
    context_parts = []

    # Contract stats
    context_parts.append(_build_contract_stats(db))

    # Ticket context if provided
    if req.ticket_id:
        tc = _build_ticket_context(db, req.ticket_id)
        if tc:
            context_parts.append(f"\nAktualne zgłoszenie (ticket #{req.ticket_id}):\n{tc}")

    # Legal context from last user message
    if req.messages:
        last_msg = req.messages[-1].content
        legal = _get_legal_context(last_msg)
        if legal:
            context_parts.append(f"\n{legal}")

    # Build system prompt with context
    full_system = SYSTEM_PROMPT + "\n\n--- KONTEKST ---\n" + "\n\n".join(context_parts)

    # Convert messages for Anthropic API
    api_messages = []
    for msg in req.messages:
        api_messages.append({
            "role": msg.role,
            "content": msg.content,
        })

    # Call Claude Sonnet for complex legal reasoning
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=full_system,
        messages=api_messages,
    )

    reply_text = response.content[0].text.strip()

    # Extract action block if present
    action = None
    action_match = re.search(r'```action\s*\n(.*?)\n```', reply_text, re.DOTALL)
    if action_match:
        try:
            action = json.loads(action_match.group(1))
            # Remove action block from displayed text
            reply_text = reply_text.replace(action_match.group(0), "").strip()
        except json.JSONDecodeError:
            pass

    context_used = "ticket" if req.ticket_id else "general"

    return AssistantResponse(
        reply=reply_text,
        action=action,
        context_used=context_used,
    )

@router.post("/assistant/execute-action")
def execute_action(data: dict, db: Session = Depends(get_db)):
    """Execute an action proposed by the AI assistant."""
    action_type = data.get("type")
    action_data = data.get("data", {})

    if action_type == "generate_contract":
        # Forward to contract generation
        from models.schemas import ContractGenerateRequest
        from services.ai_service import standardize_it_area
        from services.docx_service import generate_contract_docx
        from services.contract_numbering import generate_contract_number

        try:
            req = ContractGenerateRequest(**action_data)
        except Exception as e:
            return {"success": False, "error": f"Brakujące dane: {str(e)}"}

        it_area = standardize_it_area(req.obszar_it)
        contract_number = generate_contract_number(db)

        file_path = generate_contract_docx(
            contract_number=contract_number,
            imie=req.imie, nazwisko=req.nazwisko,
            firma=req.firma, nip=req.nip,
            regon=req.regon or "", adres=req.adres,
            email=req.email, tel=req.tel,
            rola=req.rola, stawka=req.stawka,
            klient=req.klient, data_startu=req.data_startu,
            it_area=it_area,
            opis_projektu=req.opis_projektu or "",
            miasto_klienta=req.miasto_klienta,
        )

        contract = Contract(
            number=contract_number,
            contractor_name=f"{req.imie} {req.nazwisko}",
            contractor_firstname=req.imie,
            contractor_lastname=req.nazwisko,
            contractor_company=req.firma,
            contractor_nip=req.nip,
            contractor_regon=req.regon or "",
            contractor_address=req.adres,
            contractor_email=req.email,
            contractor_phone=req.tel,
            client=req.klient,
            role=req.rola,
            rate=req.stawka,
            it_area=it_area,
            it_area_raw=req.obszar_it,
            project_description=req.opis_projektu or "",
            client_city=req.miasto_klienta,
            start_date=req.data_startu,
            status="draft",
            file_path=file_path,
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)

        return {
            "success": True,
            "type": "contract_generated",
            "contract_id": contract.id,
            "contract_number": contract.number,
            "message": f"Umowa {contract.number} wygenerowana pomyślnie!",
            "download_url": f"/api/contracts/{contract.id}/download",
        }

    elif action_type == "risk_assessment":
        return {
            "success": True,
            "type": "risk_assessed",
            "data": action_data,
            "message": f"Ocena ryzyka: {action_data.get('ryzyko', 'unknown')}",
        }

    elif action_type == "modify_paragraph":
        contract_id = action_data.get("contract_id")
        if not contract_id:
            return {"success": False, "error": "Nie podano ID umowy"}

        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return {"success": False, "error": "Umowa nie znaleziona"}

        return {
            "success": True,
            "type": "paragraph_modified",
            "data": action_data,
            "message": f"Propozycja modyfikacji {action_data.get('paragraf', '')} przygotowana",
        }

    return {"success": False, "error": "Nieznany typ akcji"}
