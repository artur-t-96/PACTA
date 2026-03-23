"""
Analytics router — all analytics/insights endpoints
"""
from fastapi import APIRouter
from sqlalchemy import func, text
from database import SessionLocal, Contract

router = APIRouter()


@router.get("/stats/new")
def get_new_stats():
    """Stats for newly generated contracts only."""
    db = SessionLocal()
    query = db.query(Contract).filter(~Contract.number.startswith("H-"))
    total = query.count()
    avg_rate = query.with_entities(func.avg(Contract.rate)).scalar() or 0
    db.close()
    return {"total": total, "avg_rate": round(float(avg_rate), 2)}


@router.get("/client-comparison")
def client_comparison():
    """Compare contract terms across top clients."""
    db = SessionLocal()
    clients = db.query(
        Contract.client, func.count(Contract.id).label("count"),
        func.avg(Contract.rate).label("avg_rate"),
        func.min(Contract.rate).label("min_rate"),
        func.max(Contract.rate).label("max_rate"),
    ).filter(Contract.rate > 0, Contract.client != "").group_by(Contract.client).having(
        func.count(Contract.id) >= 2
    ).order_by(func.count(Contract.id).desc()).limit(10).all()
    
    result = []
    for c in clients:
        areas = dict(db.query(Contract.it_area, func.count(Contract.id)).filter(
            Contract.client == c[0], Contract.rate > 0
        ).group_by(Contract.it_area).all())
        result.append({
            "client": c[0], "contracts": c[1],
            "avg_rate": round(float(c[2] or 0), 2),
            "min_rate": round(float(c[3] or 0), 2),
            "max_rate": round(float(c[4] or 0), 2),
            "areas": areas,
        })
    db.close()
    return result


@router.get("/full")
def full_analytics():
    """Full analytics: top roles + top clients."""
    db = SessionLocal()
    top_roles = db.query(Contract.role, func.count(Contract.id).label("count")).filter(
        Contract.role != ""
    ).group_by(Contract.role).order_by(func.count(Contract.id).desc()).limit(15).all()
    
    top_clients = db.query(
        Contract.client, func.count(Contract.id).label("count"),
        func.avg(Contract.rate).label("avg_rate"),
    ).filter(Contract.client != "").group_by(Contract.client).order_by(
        func.count(Contract.id).desc()
    ).limit(10).all()
    db.close()
    
    return {
        "top_roles": [{"role": r[0], "count": r[1]} for r in top_roles],
        "top_clients": [{"client": r[0], "count": r[1], "avg_rate": round(float(r[2] or 0), 2)} for r in top_clients],
    }


@router.get("/contractors")
def contractor_analytics():
    """Top contractors by contract count + contracts by year."""
    db = SessionLocal()
    top = db.query(
        Contract.contractor_name, func.count(Contract.id).label("contract_count"),
        func.max(Contract.rate).label("max_rate"),
    ).group_by(Contract.contractor_name).order_by(func.count(Contract.id).desc()).limit(20).all()
    
    all_contracts = db.query(Contract.start_date, Contract.status).filter(Contract.start_date != "").all()
    by_year = {}
    for c in all_contracts:
        if c.start_date and len(str(c.start_date)) >= 4:
            year = str(c.start_date)[:4]
            if year.isdigit() and 2015 <= int(year) <= 2030:
                by_year[year] = by_year.get(year, 0) + 1
    db.close()
    
    return {
        "top_contractors": [{"name": r[0], "contracts": r[1], "max_rate": r[2]} for r in top],
        "by_year": dict(sorted(by_year.items())),
    }


@router.get("/rate-trend")
def rate_trend():
    """Rate trends by year for new contracts."""
    db = SessionLocal()
    rows = db.execute(text("""
        SELECT strftime('%Y', created_at) as year, COUNT(*) as cnt,
               AVG(rate) as avg_rate, MIN(rate) as min_rate, MAX(rate) as max_rate
        FROM contracts WHERE rate > 0 AND number NOT LIKE 'H-%'
        AND created_at >= date('now', '-5 years')
        GROUP BY year ORDER BY year
    """)).fetchall()
    db.close()
    return [{"year": r[0], "count": r[1], "avg_rate": round(float(r[2] or 0), 2),
             "min_rate": float(r[3] or 0), "max_rate": float(r[4] or 0)} for r in rows]


@router.get("/area-value")
def area_value():
    """Portfolio value by IT area."""
    db = SessionLocal()
    rows = db.query(
        Contract.it_area, func.count(Contract.id).label("count"),
        func.avg(Contract.rate), func.sum(Contract.rate),
    ).filter(Contract.status == "aktywna", Contract.rate > 0).group_by(Contract.it_area).order_by(
        func.sum(Contract.rate).desc()
    ).all()
    db.close()
    return [{"area": r[0], "contracts": r[1], "avg_rate": round(float(r[2] or 0), 2),
             "monthly_value": round(float(r[3] or 0) * 168, 0),
             "annual_value": round(float(r[3] or 0) * 168 * 12, 0)} for r in rows]


@router.get("/seasonal")
def seasonal():
    """Contract seasonality by month."""
    db = SessionLocal()
    rows = db.execute(text("""
        SELECT CAST(strftime('%m', start_date) AS INTEGER) as month, COUNT(*) as cnt
        FROM contracts WHERE start_date != '' AND start_date IS NOT NULL AND length(start_date) >= 7
        GROUP BY month ORDER BY month
    """)).fetchall()
    db.close()
    months_pl = ["", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
                 "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]
    data = {months_pl[r[0]]: r[1] for r in rows if r[0] and 1 <= r[0] <= 12}
    return {"by_month": data, "busiest": max(data, key=data.get) if data else "", "quietest": min(data, key=data.get) if data else ""}


@router.get("/velocity")
def velocity():
    """New contracts per week/month."""
    db = SessionLocal()
    monthly = db.execute(text("""
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as cnt
        FROM contracts WHERE number NOT LIKE 'H-%' AND created_at >= date('now', '-12 months')
        GROUP BY month ORDER BY month DESC LIMIT 12
    """)).fetchall()
    db.close()
    return {"monthly": [{"period": r[0], "count": r[1]} for r in monthly]}


@router.get("/potential-duplicates")
def potential_duplicates():
    """Same contractor + same client + active."""
    db = SessionLocal()
    rows = db.execute(text("""
        SELECT contractor_name, client, COUNT(*) as cnt, GROUP_CONCAT(number, ', ') as numbers
        FROM contracts WHERE status = 'aktywna'
        GROUP BY contractor_name, client HAVING cnt > 1 ORDER BY cnt DESC LIMIT 20
    """)).fetchall()
    db.close()
    return [{"contractor": r[0], "client": r[1], "count": r[2], "numbers": r[3]} for r in rows]


@router.get("/numbers")
def contract_numbers():
    """Contract numbering — next, gaps."""
    import re
    db = SessionLocal()
    contracts = db.query(Contract.number).filter(~Contract.number.startswith("H-")).all()
    db.close()
    numbers = []
    for c in contracts:
        match = re.match(r"(\d+)/(\d+)", c.number)
        if match: numbers.append(int(match.group(1)))
    if not numbers: return {"next": "001/2026", "total_used": 0, "gaps": []}
    max_num = max(numbers)
    used = set(numbers)
    gaps = [n for n in range(1, max_num + 1) if n not in used]
    return {"next": f"{max_num + 1:03d}/2026", "total_used": len(numbers), "max_number": max_num,
            "gaps": [f"{g:03d}/2026" for g in gaps[:20]], "gap_count": len(gaps)}


@router.get("/rate-distribution")
def rate_distribution():
    """Rate histogram for active contracts."""
    db = SessionLocal()
    rates = [c.rate for c in db.query(Contract.rate).filter(Contract.rate > 0, Contract.status == "aktywna").all()]
    db.close()
    if not rates: return {"buckets": {}, "total": 0}
    buckets = {}
    for r in rates:
        key = f"{int(r // 20) * 20}-{int(r // 20) * 20 + 20}"
        buckets[key] = buckets.get(key, 0) + 1
    return {"buckets": dict(sorted(buckets.items())), "total": len(rates),
            "min": min(rates), "max": max(rates), "avg": round(sum(rates) / len(rates), 2),
            "median": sorted(rates)[len(rates) // 2]}


@router.get("/aging")
def aging():
    """Contract duration distribution."""
    from datetime import datetime as _dt
    db = SessionLocal()
    active = db.query(Contract).filter(Contract.status == "aktywna", Contract.start_date != "", Contract.start_date != None).all()
    buckets = {"0-3m": 0, "3-6m": 0, "6-12m": 0, "1-2y": 0, "2-3y": 0, "3y+": 0}
    for c in active:
        try:
            months = (_dt.now() - _dt.strptime(c.start_date, "%Y-%m-%d")).days / 30
            if months < 3: buckets["0-3m"] += 1
            elif months < 6: buckets["3-6m"] += 1
            elif months < 12: buckets["6-12m"] += 1
            elif months < 24: buckets["1-2y"] += 1
            elif months < 36: buckets["2-3y"] += 1
            else: buckets["3y+"] += 1
        except ValueError: pass
    db.close()
    return {"total_active": len(active), "aging_buckets": buckets}


@router.get("/timeline")
def timeline(days_ahead: int = 30):
    """Upcoming contract starts."""
    from datetime import datetime as _dt, timedelta
    db = SessionLocal()
    today = _dt.now().strftime("%Y-%m-%d")
    future = (_dt.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    upcoming = db.query(Contract).filter(
        Contract.start_date >= today, Contract.start_date <= future,
        Contract.status.in_(["draft", "do_podpisu", "aktywna"]),
    ).order_by(Contract.start_date).limit(20).all()
    db.close()
    return [{"id": c.id, "number": c.number, "contractor": c.contractor_name,
             "client": c.client, "role": c.role, "start_date": c.start_date,
             "status": c.status, "rate": c.rate} for c in upcoming]


@router.get("/expiring")
def expiring(days: int = 90):
    """Active contracts with end_date within N days."""
    from datetime import datetime as _dt, timedelta
    db = SessionLocal()
    today = _dt.now().strftime("%Y-%m-%d")
    future = (_dt.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    expiring = db.query(Contract).filter(
        Contract.end_date != None, Contract.end_date != "",
        Contract.end_date <= future, Contract.end_date >= today,
        Contract.status == "aktywna",
    ).all()
    db.close()
    return [{"id": c.id, "number": c.number, "contractor": c.contractor_name,
             "client": c.client, "end_date": c.end_date} for c in expiring]


@router.get("/recruiters")
def recruiters():
    """Contract stats per recruiter."""
    db = SessionLocal()
    rows = db.execute(text("""
        SELECT created_by, COUNT(*) as cnt, COUNT(CASE WHEN status = 'aktywna' THEN 1 END) as active
        FROM contracts WHERE created_by IS NOT NULL AND created_by != '' AND created_by != 'system'
        GROUP BY created_by ORDER BY cnt DESC LIMIT 20
    """)).fetchall()
    db.close()
    return [{"recruiter": r[0], "total": r[1], "active": r[2]} for r in rows]


@router.get("/portfolio-value")
def portfolio_value():
    """Total portfolio value estimate."""
    db = SessionLocal()
    active = db.query(Contract).filter(Contract.status == "aktywna", Contract.rate > 0).all()
    total_monthly = sum(c.rate * 168 for c in active)
    margin_pct = 15
    revenue_monthly = total_monthly * (1 + margin_pct / 100)
    
    by_client = {}
    for c in active:
        if c.client not in by_client: by_client[c.client] = {"contracts": 0, "monthly_cost": 0}
        by_client[c.client]["contracts"] += 1
        by_client[c.client]["monthly_cost"] += c.rate * 168
    top = sorted(by_client.items(), key=lambda x: -x[1]["monthly_cost"])[:10]
    db.close()
    
    return {
        "active_with_rate": len(active),
        "contractor_cost": {"monthly": round(total_monthly, 0), "annual": round(total_monthly * 12, 0)},
        "client_revenue_est": {"monthly": round(revenue_monthly, 0), "annual": round(revenue_monthly * 12, 0)},
        "margin_est": {"monthly": round(revenue_monthly - total_monthly, 0), "annual": round((revenue_monthly - total_monthly) * 12, 0), "pct": margin_pct},
        "top_clients": [{"client": n, "contracts": d["contracts"], "monthly_cost": round(d["monthly_cost"], 0), "annual_cost": round(d["monthly_cost"] * 12, 0)} for n, d in top],
    }


@router.get("/rate-comparison")
def rate_comparison():
    """Compare avg rates between top clients."""
    db = SessionLocal()
    clients = db.query(
        Contract.client,
        func.count(Contract.id),
        func.avg(Contract.rate),
        func.min(Contract.rate),
        func.max(Contract.rate),
    ).filter(
        Contract.rate > 0, Contract.status == "aktywna",
    ).group_by(Contract.client).having(func.count(Contract.id) >= 1).order_by(
        func.avg(Contract.rate).desc()
    ).limit(10).all()
    db.close()
    
    return [
        {"client": c[0], "contracts": c[1], "avg_rate": round(float(c[2] or 0), 1),
         "min_rate": float(c[3] or 0), "max_rate": float(c[4] or 0)}
        for c in clients
    ]


@router.get("/forecast")
def forecast():
    """Forecast contracts for current year based on velocity."""
    from datetime import datetime as _dt
    db = SessionLocal()
    current_year = _dt.now().year
    current_month = _dt.now().month
    
    # Count so far this year
    ytd = db.query(Contract).filter(Contract.start_date.like(f"{current_year}%")).count()
    
    # Monthly average this year
    monthly_avg = ytd / max(current_month, 1)
    remaining_months = 12 - current_month
    forecast = ytd + int(monthly_avg * remaining_months)
    
    # Last year comparison
    last_year = db.query(Contract).filter(Contract.start_date.like(f"{current_year - 1}%")).count()
    
    db.close()
    
    growth_pct = round(((forecast - last_year) / max(last_year, 1)) * 100, 1)
    
    return {
        "year": current_year,
        "ytd": ytd,
        "monthly_avg": round(monthly_avg, 1),
        "forecast_eoy": forecast,
        "last_year": last_year,
        "growth_pct": growth_pct,
        "insight": f"Prognoza {current_year}: {forecast} umów ({'+' if growth_pct > 0 else ''}{growth_pct}% vs {current_year-1})",
    }


@router.get("/yoy")
def year_over_year():
    """Year-over-year comparison."""
    from datetime import datetime as _dt
    db = SessionLocal()
    current_year = _dt.now().year
    
    years = {}
    for year in range(current_year - 3, current_year + 1):
        count = db.query(Contract).filter(
            Contract.start_date.like(f"{year}%")
        ).count()
        active = db.query(Contract).filter(
            Contract.start_date.like(f"{year}%"),
            Contract.status == "aktywna"
        ).count()
        years[str(year)] = {"total": count, "active": active}
    
    db.close()
    return years


@router.get("/client-ranking")
def client_ranking():
    """Rank clients by estimated annual revenue."""
    db = SessionLocal()
    clients = db.query(
        Contract.client,
        func.count(Contract.id).label("contracts"),
        func.sum(Contract.rate * 168).label("monthly_cost"),
        func.avg(Contract.rate).label("avg_rate"),
    ).filter(
        Contract.status == "aktywna",
        Contract.rate > 0,
    ).group_by(Contract.client).order_by(
        func.sum(Contract.rate * 168).desc()
    ).limit(15).all()
    db.close()
    
    return [
        {
            "rank": i + 1,
            "client": c[0],
            "active_contracts": c[1],
            "monthly_revenue_est": round(float(c[2] or 0) * 1.15, 0),  # 15% margin
            "annual_revenue_est": round(float(c[2] or 0) * 1.15 * 12, 0),
            "avg_rate": round(float(c[3] or 0), 2),
        }
        for i, c in enumerate(clients)
    ]


@router.post("/snapshot")
def save_snapshot():
    """Save daily stats snapshot."""
    import json, os
    from datetime import datetime as _dt
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    avg_rate = float(db.query(func.avg(Contract.rate)).filter(Contract.rate > 0, ~Contract.number.startswith("H-")).scalar() or 0)
    db.close()
    
    snapshot = {"date": _dt.now().strftime("%Y-%m-%d"), "total": total, "active": active, "avg_rate": round(avg_rate, 2)}
    snapshots_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data/snapshots.jsonl")
    os.makedirs(os.path.dirname(snapshots_file), exist_ok=True)
    with open(snapshots_file, "a") as f:
        f.write(json.dumps(snapshot, ensure_ascii=False) + "\n")
    return {"saved": True, "snapshot": snapshot}
