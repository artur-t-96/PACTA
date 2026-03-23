"""
Chat service — answer natural language questions about contracts
Designed for integration with OpenClaw/Telegram/Slack
"""
import anthropic
import os
from database import SessionLocal, Contract
from sqlalchemy import func


def answer_question(question: str) -> str:
    """Answer a question about contracts using AI + real data."""
    db = SessionLocal()
    
    # Gather context
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    avg_rate = db.query(func.avg(Contract.rate)).filter(Contract.rate > 0, ~Contract.number.startswith("H-")).scalar() or 0
    
    top_clients = dict(db.query(
        Contract.client, func.count(Contract.id)
    ).group_by(Contract.client).order_by(func.count(Contract.id).desc()).limit(5).all())
    
    top_areas = dict(db.query(
        Contract.it_area, func.count(Contract.id)
    ).group_by(Contract.it_area).order_by(func.count(Contract.id).desc()).limit(5).all())
    
    db.close()
    
    context = f"""Stan umów B2B.net S.A.:
- Łącznie: {total} umów
- Aktywne: {active}
- Avg stawka (nowe): {round(float(avg_rate), 2)} PLN/h
- Top klienci: {top_clients}
- Top obszary IT: {top_areas}"""
    
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        system="Jesteś asystentem systemu PARAGRAF — zarządzanie umowami B2B dla B2B.net S.A. Odpowiadaj krótko po polsku.",
        messages=[{"role": "user", "content": f"Kontekst:\n{context}\n\nPytanie: {question}"}],
    )
    
    return msg.content[0].text.strip()
