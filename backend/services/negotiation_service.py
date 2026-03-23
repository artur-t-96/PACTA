"""
Negotiation service — AI-powered rate recommendation for new contracts
Based on: market benchmarks, historical B2B.net data, client history, role seniority
"""
from database import SessionLocal, Contract
from sqlalchemy import func
from services.benchmark_service import MARKET_RATES, _detect_seniority


def recommend_rate(
    role: str,
    it_area: str,
    client: str,
    experience_years: int = 0,
) -> dict:
    """Recommend optimal rate for a new contract."""
    db = SessionLocal()
    
    seniority = _detect_seniority(role)
    if experience_years >= 8:
        seniority = "lead"
    elif experience_years >= 5:
        seniority = "senior"
    elif experience_years >= 2:
        seniority = "mid"
    elif experience_years > 0:
        seniority = "junior"
    
    # Market benchmark
    area_data = MARKET_RATES.get(it_area, MARKET_RATES.get("Software Development", {}))
    level_data = area_data.get(seniority, area_data.get("mid", {}))
    
    market_min = level_data.get("min", 100)
    market_median = level_data.get("median", 140)
    market_max = level_data.get("max", 200)
    
    # Historical B2B.net rates for same role/area
    similar_rates = db.query(Contract.rate).filter(
        Contract.it_area == it_area,
        Contract.rate > 0,
    ).all()
    b2b_rates = [r[0] for r in similar_rates if r[0] > 0]
    b2b_avg = sum(b2b_rates) / len(b2b_rates) if b2b_rates else market_median
    
    # Historical rates for same client
    client_rates = db.query(Contract.rate).filter(
        Contract.client.ilike(f"%{client}%"),
        Contract.rate > 0,
    ).all()
    client_avg = sum(r[0] for r in client_rates) / len(client_rates) if client_rates else 0
    
    # Count contracts with this client (leverage)
    client_count = db.query(Contract).filter(
        Contract.client.ilike(f"%{client}%"),
        Contract.status == "aktywna",
    ).count()
    
    db.close()
    
    # Calculate recommended rate
    # Weight: 40% market, 30% B2B.net history, 30% client history
    if client_avg > 0:
        recommended = market_median * 0.4 + b2b_avg * 0.3 + client_avg * 0.3
    else:
        recommended = market_median * 0.5 + b2b_avg * 0.5
    
    # Adjust for leverage (more contracts = more negotiation power)
    if client_count > 50:
        leverage_bonus = 5  # Strong position
    elif client_count > 20:
        leverage_bonus = 3
    elif client_count > 5:
        leverage_bonus = 0
    else:
        leverage_bonus = -5  # New client, be competitive
    
    recommended = round(recommended + leverage_bonus, 0)
    
    # Floor/ceiling
    recommended = max(recommended, market_min)
    recommended = min(recommended, market_max * 1.1)
    
    # Range
    range_low = max(round(recommended * 0.9, 0), market_min)
    range_high = min(round(recommended * 1.1, 0), market_max)
    
    return {
        "recommended_rate": recommended,
        "range": {"min": range_low, "max": range_high},
        "seniority": seniority,
        "market": {"min": market_min, "median": market_median, "max": market_max},
        "b2b_net_avg": round(b2b_avg, 2),
        "client_avg": round(client_avg, 2) if client_avg > 0 else None,
        "client_contracts": client_count,
        "leverage": "strong" if client_count > 50 else "medium" if client_count > 20 else "standard" if client_count > 5 else "new_client",
        "reasoning": _build_reasoning(recommended, market_median, b2b_avg, client_avg, client_count, seniority, it_area),
    }


def _build_reasoning(rec, market, b2b, client, count, seniority, area):
    parts = [f"Rekomendacja {rec:.0f} PLN/h dla {seniority} {area}."]
    parts.append(f"Mediana rynkowa: {market} PLN/h.")
    if b2b > 0:
        parts.append(f"Średnia B2B.net w tym obszarze: {b2b:.0f} PLN/h.")
    if client > 0:
        parts.append(f"Średnia u tego klienta: {client:.0f} PLN/h.")
    if count > 50:
        parts.append(f"Silna pozycja negocjacyjna ({count} aktywnych umów u klienta).")
    elif count > 20:
        parts.append(f"Dobra pozycja ({count} umów u klienta).")
    elif count < 5:
        parts.append(f"Nowy klient — stawka wejściowa, konkurencyjna.")
    return " ".join(parts)
