"""
AI router — AI-powered endpoints (search, chat, generate, recommend)
"""
import re
import json
from fastapi import APIRouter
from sqlalchemy import or_
from database import SessionLocal, Contract
from services.rag_service import search_legal_context

router = APIRouter()


@router.post("/generate")
def ai_generate(data: dict):
    """Extract contract data from NL description."""
    import anthropic
    description = data.get("description", "")
    if not description:
        return {"error": "Podaj opis umowy"}
    
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=500,
        messages=[{"role": "user", "content": f"""Wyodrębnij dane do umowy B2B z opisu:
"{description}"
Odpowiedz JSON: {{"imie":"...","nazwisko":"...","firma":"...","nip":"","adres":"","email":"","tel":"","rola":"...","stawka":0,"klient":"...","data_startu":"YYYY-MM-DD","obszar_it":"...","miasto_klienta":"...","opis_projektu":"..."}}
Wypełnij co możesz. Stawkę jako liczbę."""}],
    )
    text = msg.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        return {"error": "Nie udało się wyodrębnić danych"}
    try:
        return {"success": True, "extracted": json.loads(match.group()), "description": description}
    except:
        return {"error": "Nieprawidłowy format"}


@router.get("/chat")
def chat(q: str):
    """Natural language Q&A about contracts."""
    from services.chat_service import answer_question
    return {"question": q, "answer": answer_question(q)}


@router.get("/search")
def ai_search(q: str):
    """AI-powered NL search (Haiku interprets query)."""
    import anthropic
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=100,
        messages=[{"role": "user", "content": f"""Wyodrębnij parametry wyszukiwania z: "{q}"
Odpowiedz JSON: {{"client":"...","role":"...","name":"...","status":"...","area":"..."}}
Tylko wypełnione pola."""}],
    )
    text = msg.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    params = json.loads(match.group()) if match else {}
    
    db = SessionLocal()
    query = db.query(Contract)
    if params.get("client"): query = query.filter(Contract.client.ilike(f"%{params['client']}%"))
    if params.get("role"):
        role_term = params["role"].rstrip("zyów")
        query = query.filter(Contract.role.ilike(f"%{role_term}%"))
    if params.get("name"): query = query.filter(Contract.contractor_name.ilike(f"%{params['name']}%"))
    if params.get("status"): query = query.filter(Contract.status == params["status"])
    if params.get("area"): query = query.filter(Contract.it_area.ilike(f"%{params['area']}%"))
    contracts = query.limit(20).all()
    db.close()
    
    return {
        "query": q, "interpreted_as": params, "total": len(contracts),
        "results": [{"id": c.id, "number": c.number, "name": c.contractor_name,
                      "client": c.client, "role": c.role, "rate": c.rate, "status": c.status} for c in contracts],
    }


@router.get("/recommend-rate")
def recommend_rate(role: str, area: str, client: str, years: int = 0):
    """AI-powered rate recommendation."""
    from services.negotiation_service import recommend_rate
    return recommend_rate(role, area, client, years)


@router.get("/legal-search")
def legal_search(q: str, limit: int = 5):
    """Search legal knowledge base."""
    results = search_legal_context(q, n_results=limit)
    return {"query": q, "results": results, "count": len(results)}
