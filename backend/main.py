"""
PARAGRAF — AI Contract Management System
Backend FastAPI Application v6.5
"""
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("paragraf")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import contracts, analytics, exports, ai, system, tickets, assistant

app = FastAPI(
    title="PARAGRAF — AI Contract Management",
    description="System zarządzania umowami B2B dla B2B.net S.A.",
    version="6.6.0",
    contact={"name": "B2B.net S.A.", "email": "artek9321@gmail.com"},
    openapi_tags=[
        {"name": "contracts", "description": "Contract CRUD, generation, modification, risks"},
        {"name": "analytics", "description": "Statistics, trends, benchmarks, insights"},
        {"name": "exports", "description": "CSV, XLSX, ZIP exports"},
        {"name": "ai", "description": "AI-powered search, chat, generation, recommendations"},
        {"name": "system", "description": "Templates, clauses, backup, import, lookup"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("PARAGRAF_API_KEY", "")
AUTH_ENABLED = os.getenv("PARAGRAF_AUTH", "").lower() in ("true", "1", "yes")


@app.middleware("http")
async def log_and_auth(request, call_next):
    import time as _time
    from starlette.responses import JSONResponse

    PUBLIC_PATHS = ("/health", "/", "/docs", "/openapi.json", "/api/auth/login")
    path = request.url.path

    # API key check (legacy — single shared API key)
    if API_KEY and path.startswith("/api/") and path not in PUBLIC_PATHS:
        key = request.headers.get("X-API-Key", request.query_params.get("api_key", ""))
        if key != API_KEY:
            # Also allow JWT Bearer token as alternative
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return JSONResponse(status_code=401, content={"detail": "Invalid API key"})

    # JWT auth — always active for ticket endpoints; optional elsewhere
    user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        from services.auth_service import verify_token
        user = verify_token(token)

    # Also support legacy API key per-user auth
    if not user and AUTH_ENABLED:
        user_key = request.headers.get("X-API-Key", request.query_params.get("api_key", ""))
        if user_key:
            from services.auth_service import authenticate
            user = authenticate(api_key=user_key)

    # Store current user in request state for route handlers
    request.state.current_user = user

    # Enforce auth on ticket endpoints (always require login)
    if path.startswith("/api/tickets"):
        if not user:
            return JSONResponse(status_code=401, content={"detail": "Wymagane logowanie (Bearer token)"})

    # RBAC check (optional — set PARAGRAF_AUTH=true)
    if AUTH_ENABLED and path.startswith("/api/") and path not in PUBLIC_PATHS:
        if not user:
            return JSONResponse(status_code=401, content={"detail": "Wymagane logowanie"})
        from services.auth_service import check_endpoint_permission
        if not check_endpoint_permission(user, request.method, path):
            return JSONResponse(status_code=403, content={"detail": "Insufficient permissions"})

    # Rate limiting
    from middleware.rate_limit import check_rate_limit
    client_ip = request.client.host if request.client else "unknown"
    is_ai = path.startswith("/api/ai/") or "full-review" in path
    if not check_rate_limit(client_ip, is_ai):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again later."})

    start = _time.time()
    response = await call_next(request)
    elapsed = (_time.time() - start) * 1000
    if not path.startswith("/_next"):
        logger.info(f"{request.method} {path} → {response.status_code} ({elapsed:.0f}ms)")
    return response


# Mount routers
app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(exports.router, prefix="/api/contracts/export", tags=["exports"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(assistant.router, prefix="/api/ai", tags=["ai-assistant"])

# Output directory
os.makedirs(os.getenv("OUTPUT_DIR", "./output/contracts"), exist_ok=True)


@app.on_event("startup")
async def startup():
    init_db()
    logger.info(f"PARAGRAF v6.9 started — {os.getenv('DATABASE_URL', 'sqlite')}")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    from starlette.responses import JSONResponse
    logger.error(f"Unhandled error: {request.url.path} — {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Wewnętrzny błąd serwera", "path": str(request.url.path)},
    )


@app.get("/")
def root():
    from database import SessionLocal, Contract
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    db.close()
    return {"status": "ok", "system": "PARAGRAF", "version": "6.5.0", "contracts": total, "active": active}


@app.get("/health")
def health():
    from database import SessionLocal, Contract
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    db.close()
    return {"status": "healthy", "version": "6.5.0", "contracts": total, "active": active}


# Standalone endpoints that don't fit in routers
@app.get("/api/live")
def live():
    """Live stats snapshot."""
    from datetime import datetime as _dt
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    avg_rate = float(db.query(func.avg(Contract.rate)).filter(
        Contract.rate > 0, ~Contract.number.startswith("H-")).scalar() or 0)
    db.close()
    return {"timestamp": _dt.now().isoformat(), "total": total, "active": active, "avg_rate": round(avg_rate, 2)}


@app.get("/api/stats/summary")
def quick_summary():
    """One-line text summary for Telegram/chat."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    new = db.query(Contract).filter(~Contract.number.startswith("H-")).count()
    avg = float(db.query(func.avg(Contract.rate)).filter(Contract.rate > 0, ~Contract.number.startswith("H-")).scalar() or 0)
    db.close()
    return {"text": f"PARAGRAF: {total} umów ({active} aktywnych, {new} nowych). Avg {round(avg, 0)} PLN/h."}


@app.get("/api/available-contractors")
def available_contractors(area: str = None):
    """Find contractors who had contracts but are currently not active (available for rehire)."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    
    # Contractors with ended contracts but no active ones
    ended = db.query(Contract.contractor_name, Contract.role, Contract.it_area,
                     func.max(Contract.rate).label("last_rate")).filter(
        Contract.status == "zakonczona",
    ).group_by(Contract.contractor_name).all()
    
    active_names = set(c[0] for c in db.query(Contract.contractor_name).filter(Contract.status == "aktywna").all())
    
    available = []
    for name, role, it_area, rate in ended:
        if name not in active_names:
            if area and area.lower() not in (it_area or "").lower():
                continue
            available.append({
                "name": name, "last_role": role, "it_area": it_area,
                "last_rate": rate,
            })
    
    db.close()
    return {"total": len(available), "contractors": available[:30]}


@app.get("/api/overview")
def system_overview():
    """Complete system overview in one call."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    new = db.query(Contract).filter(~Contract.number.startswith("H-")).count()
    avg_rate = float(db.query(func.avg(Contract.rate)).filter(Contract.rate > 0, ~Contract.number.startswith("H-")).scalar() or 0)
    by_status = dict(db.query(Contract.status, func.count(Contract.id)).group_by(Contract.status).all())
    clients_count = db.query(func.count(func.distinct(Contract.client))).scalar()
    db.close()
    return {
        "version": "7.0.0", "total": total, "active": active, "new": new,
        "avg_rate": round(avg_rate, 2), "by_status": by_status, "clients": clients_count,
        "endpoints": 100, "pages": 24, "services": 23,
    }


@app.get("/api/financial-summary")
def financial_summary():
    """Financial summary for accounting — monthly costs by client."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    
    by_client = db.query(
        Contract.client,
        func.count(Contract.id).label("count"),
        func.sum(Contract.rate * 168).label("monthly_cost"),
    ).filter(
        Contract.status == "aktywna", Contract.rate > 0
    ).group_by(Contract.client).order_by(func.sum(Contract.rate * 168).desc()).all()
    
    total_monthly = sum(r[2] or 0 for r in by_client)
    
    db.close()
    
    return {
        "total_monthly_cost": round(total_monthly, 0),
        "total_annual_cost": round(total_monthly * 12, 0),
        "by_client": [
            {"client": r[0], "contracts": r[1], "monthly_cost": round(float(r[2] or 0), 0)}
            for r in by_client
        ],
    }


@app.get("/api/system-info")
def system_info():
    """Detailed system info."""
    import platform
    return {
        "system": "PARAGRAF", "version": "7.0.0",
        "python": platform.python_version(),
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
    }


@app.get("/api/batch-quality")
def batch_quality():
    """Batch DOCX quality check."""
    import re
    from docx import Document as DocxDocument
    from database import SessionLocal, Contract
    db = SessionLocal()
    contracts = db.query(Contract).filter(Contract.file_path != "", Contract.file_path != None, ~Contract.number.startswith("H-")).all()
    results = {"total_checked": 0, "clean": 0, "with_issues": 0, "issues": []}
    for c in contracts:
        if not c.file_path or not os.path.exists(c.file_path): continue
        results["total_checked"] += 1
        try:
            doc = DocxDocument(c.file_path)
            blanks = sum(1 for p in doc.paragraphs if re.search(r'_{5,}', p.text.strip()) and not (p.text.strip().count("_") > 10 and all(ch in "_\t \n" for ch in p.text.strip())) and "B2B.net" not in p.text and c.contractor_name not in p.text)
            if blanks > 0:
                results["with_issues"] += 1
                results["issues"].append({"id": c.id, "number": c.number, "blanks": blanks})
            else:
                results["clean"] += 1
        except Exception as e:
            results["issues"].append({"id": c.id, "number": c.number, "error": str(e)})
    db.close()
    return results


@app.get("/api/funnel")
def contract_funnel():
    """Contract lifecycle funnel — how many at each stage."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    db = SessionLocal()
    
    # Only non-historical
    stages = dict(db.query(Contract.status, func.count(Contract.id)).filter(
        ~Contract.number.startswith("H-")
    ).group_by(Contract.status).all())
    
    total = sum(stages.values())
    
    funnel = [
        {"stage": "Wygenerowane (draft)", "count": stages.get("draft", 0), "color": "#FCD34D"},
        {"stage": "Do podpisu", "count": stages.get("do_podpisu", 0), "color": "#A78BFA"},
        {"stage": "Aktywne", "count": stages.get("aktywna", 0), "color": "#34D399"},
        {"stage": "Zakończone", "count": stages.get("zakonczona", 0), "color": "#9CA3AF"},
        {"stage": "Anulowane", "count": stages.get("anulowana", 0), "color": "#F87171"},
    ]
    
    db.close()
    return {"total": total, "funnel": funnel}


@app.get("/api/pending")
def pending():
    """Contracts needing attention."""
    from database import SessionLocal, Contract
    db = SessionLocal()
    do_podpisu = db.query(Contract).filter(Contract.status == "do_podpisu").all()
    drafts = db.query(Contract).filter(Contract.status == "draft", ~Contract.number.startswith("H-")).all()
    db.close()
    return {
        "do_podpisu": [{"id": c.id, "number": c.number, "contractor": c.contractor_name, "client": c.client} for c in do_podpisu],
        "drafts": [{"id": c.id, "number": c.number, "contractor": c.contractor_name, "client": c.client} for c in drafts],
        "do_podpisu_count": len(do_podpisu), "drafts_count": len(drafts),
    }


@app.get("/api/ksef-readiness")
def ksef():
    """KSeF compliance check."""
    from database import SessionLocal, Contract
    db = SessionLocal()
    active = db.query(Contract).filter(Contract.status == "aktywna").all()
    ready = sum(1 for c in active if c.contractor_nip and len(c.contractor_nip.strip()) == 10
                and c.contractor_email and "@" in str(c.contractor_email) and c.rate and c.rate > 0)
    db.close()
    total = len(active)
    return {"total_active": total, "ksef_ready": ready, "ksef_not_ready": total - ready,
            "readiness_pct": round((ready / total) * 100, 1) if total > 0 else 0}


@app.get("/api/quality")
def quality():
    from services.quality_service import run_quality_check
    return run_quality_check()


@app.get("/api/alerts")
def alerts():
    from services.alerts_service import get_contracts_needing_attention
    from database import SessionLocal
    db = SessionLocal()
    try: return get_contracts_needing_attention(db)
    finally: db.close()


@app.get("/api/stale-contracts")
def stale_contracts(months: int = 24):
    """Active contracts older than N months — may need review/renewal."""
    from database import SessionLocal, Contract
    from datetime import datetime as _dt, timedelta
    db = SessionLocal()
    cutoff = (_dt.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")
    
    stale = db.query(Contract).filter(
        Contract.status == "aktywna",
        Contract.start_date != "", Contract.start_date != None,
        Contract.start_date <= cutoff,
        ~Contract.number.startswith("H-"),
    ).order_by(Contract.start_date).all()
    db.close()
    
    return {
        "total": len(stale),
        "months_threshold": months,
        "contracts": [
            {"id": c.id, "number": c.number, "contractor": c.contractor_name,
             "client": c.client, "role": c.role, "rate": c.rate,
             "start_date": c.start_date,
             "months_active": round((_dt.now() - _dt.strptime(c.start_date, "%Y-%m-%d")).days / 30, 1) if c.start_date and len(c.start_date) >= 10 else 0}
            for c in stale
        ],
    }


@app.get("/api/renewals")
def renewals():
    from services.notification_service import get_renewal_candidates
    from database import SessionLocal
    db = SessionLocal()
    try: return get_renewal_candidates(db)
    finally: db.close()


@app.get("/api/digest")
def digest():
    from services.notification_service import generate_daily_digest
    from database import SessionLocal
    db = SessionLocal()
    try: return generate_daily_digest(db)
    finally: db.close()


@app.get("/api/report")
def daily_report():
    """Markdown daily report."""
    from services.notification_service import generate_daily_digest
    from database import SessionLocal, Contract
    from sqlalchemy import func
    from datetime import datetime as _dt
    
    db = SessionLocal()
    d = generate_daily_digest(db)
    total = db.query(Contract).count()
    by_status = dict(db.query(Contract.status, func.count(Contract.id)).group_by(Contract.status).all())
    avg = db.query(func.avg(Contract.rate)).filter(Contract.rate > 0).scalar() or 0
    db.close()
    
    report = f"# 📋 PARAGRAF — Raport dzienny\n## {d['date']}\n\n"
    report += f"- **Łącznie:** {total}\n- **Aktywne:** {d['summary']['active_contracts']}\n"
    report += f"- **Avg stawka:** {round(float(avg), 2)} PLN/h\n\n### Statusy\n"
    for s, c in sorted(by_status.items(), key=lambda x: -x[1]):
        e = {"aktywna": "🟢", "draft": "🟡", "zakonczona": "⚪", "do_podpisu": "🟣", "anulowana": "🔴"}.get(s, "⚫")
        report += f"- {e} {s}: **{c}**\n"
    return {"markdown": report, "digest": d}


@app.get("/api/report/weekly")
def weekly_report():
    """Weekly management report."""
    from database import SessionLocal, Contract
    from sqlalchemy import func
    from datetime import datetime as _dt, timedelta
    
    db = SessionLocal()
    week_ago = (_dt.now() - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    
    new_this_week = db.query(Contract).filter(
        Contract.created_at >= week_ago, ~Contract.number.startswith("H-")
    ).count()
    
    activated = db.query(Contract).filter(
        Contract.status == "aktywna", Contract.updated_at >= week_ago
    ).count()
    
    total = db.query(Contract).count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    db.close()
    
    report = f"""# 📊 Raport tygodniowy — {_dt.now().strftime('%d.%m.%Y')}

### Kluczowe metryki
- **Nowe umowy (tydzień):** {new_this_week}
- **Aktywowane (tydzień):** {activated}
- **Łącznie aktywnych:** {active} / {total}

---
*PARAGRAF AI · {_dt.now().strftime('%H:%M')}*
"""
    return {"markdown": report, "new_this_week": new_this_week, "activated": activated}


@app.get("/api/report/monthly")
def monthly_report(month: int = None, year: int = None):
    from database import SessionLocal, Contract
    from sqlalchemy import func
    from datetime import datetime as _dt
    if not month: month = _dt.now().month
    if not year: year = _dt.now().year
    month_str = f"{year}-{month:02d}"
    
    db = SessionLocal()
    new = db.query(Contract).filter(Contract.created_at >= f"{month_str}-01").count()
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    db.close()
    
    months_pl = ["", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
                 "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]
    return {"markdown": f"# 📊 {months_pl[month]} {year}\n- Nowe: {new}\n- Aktywne: {active}\n",
            "month": month, "year": year, "new_contracts": new, "active": active}


@app.get("/api/benchmark/{contract_id}")
def benchmark_one(contract_id: int):
    from services.benchmark_service import benchmark_rate
    from database import SessionLocal, Contract
    db = SessionLocal()
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    db.close()
    if not c: return {"error": "Not found"}
    return benchmark_rate(c.rate, c.it_area, c.role)


@app.get("/api/benchmark")
def benchmark_all():
    from services.benchmark_service import benchmark_portfolio
    from database import SessionLocal, Contract
    db = SessionLocal()
    contracts = db.query(Contract).filter(Contract.rate > 0).all()
    result = benchmark_portfolio(contracts)
    db.close()
    return result


@app.get("/api/traffit/status")
def traffit_status():
    from services.traffit_service import get_client
    c = get_client()
    return {"configured": c.is_configured(), "base_url": c.base_url,
            "message": "Ready" if c.is_configured() else "Set TRAFFIT_API_KEY in .env"}


@app.get("/api/enrichment/suggest-rates")
def suggest_rates(limit: int = 20):
    from database import SessionLocal, Contract
    from services.benchmark_service import MARKET_RATES, _detect_seniority
    db = SessionLocal()
    missing = db.query(Contract).filter(Contract.rate == 0, Contract.status == "aktywna", Contract.role != "").limit(limit).all()
    db.close()
    suggestions = []
    for c in missing:
        seniority = _detect_seniority(c.role)
        area_data = MARKET_RATES.get(c.it_area, MARKET_RATES.get("Software Development", {}))
        level = area_data.get(seniority, area_data.get("mid", {}))
        suggestions.append({"id": c.id, "number": c.number, "contractor": c.contractor_name,
                            "client": c.client, "role": c.role, "seniority": seniority,
                            "suggested_rate": level.get("median", 0),
                            "range": {"min": level.get("min", 0), "max": level.get("max", 0)}})
    return {"total_missing": len(missing), "suggestions": suggestions}


@app.get("/api/contracts/compare")
def compare(id1: int, id2: int):
    from database import SessionLocal, Contract
    db = SessionLocal()
    c1, c2 = db.query(Contract).filter(Contract.id == id1).first(), db.query(Contract).filter(Contract.id == id2).first()
    db.close()
    if not c1 or not c2: return {"error": "Not found"}
    def d(c): return {"id": c.id, "number": c.number, "contractor": c.contractor_name, "client": c.client,
                       "role": c.role, "rate": c.rate, "it_area": c.it_area, "status": c.status}
    d1, d2 = d(c1), d(c2)
    diffs = [{"field": k, "contract_1": d1[k], "contract_2": d2[k]} for k in d1 if k != "id" and d1[k] != d2[k]]
    return {"contract_1": d1, "contract_2": d2, "differences": diffs, "rate_diff": round((c1.rate or 0) - (c2.rate or 0), 2)}


@app.get("/api/contracts/{cid}/checklist")
def checklist(cid: int):
    from database import SessionLocal, Contract, ContractAuditLog
    db = SessionLocal()
    c = db.query(Contract).filter(Contract.id == cid).first()
    if not c: db.close(); return {"error": "Not found"}
    audit = db.query(ContractAuditLog).filter(ContractAuditLog.contract_id == cid).all()
    actions = set(a.action for a in audit)
    db.close()
    items = [
        {"step": "Generowanie umowy", "done": "created" in actions},
        {"step": "Dane NIP/email", "done": bool(c.contractor_nip and c.contractor_email)},
        {"step": "Weryfikacja prawna", "done": any(a in actions for a in ["risk_checked", "full_review"])},
        {"step": "Do podpisu", "done": c.status in ("do_podpisu", "aktywna", "zakonczona")},
        {"step": "Email powitalny", "done": "email_sent" in actions},
        {"step": "Aktywacja", "done": c.status in ("aktywna", "zakonczona")},
        {"step": "Pierwsza faktura", "done": False},
    ]
    done = sum(1 for i in items if i["done"])
    return {"contract_id": cid, "number": c.number, "progress_pct": round(done / len(items) * 100, 1),
            "done": done, "total": len(items), "checklist": items}
