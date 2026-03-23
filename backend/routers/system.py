"""
System router — health, backup, import, webhook, usage, settings
"""
import os
import json
from fastapi import APIRouter
from database import SessionLocal, Contract, ContractAuditLog
from sqlalchemy import func, or_
from services.rag_service import search_legal_context

router = APIRouter()


# ===== Auth / Users =====

@router.get("/users")
def get_users():
    """List all users."""
    from services.auth_service import list_users
    return list_users()


@router.get("/roles")
def get_roles_list():
    """Get available roles and permissions."""
    from services.auth_service import ROLES
    return {
        role: {"label": data["label"], "permissions_count": len(data["permissions"])}
        for role, data in ROLES.items()
    }


@router.post("/users")
def create_user_endpoint(data: dict):
    """Create a new user."""
    from services.auth_service import create_user
    return create_user(
        username=data.get("username", ""),
        name=data.get("name", ""),
        role=data.get("role", "viewer"),
        password=data.get("password", ""),
    )


@router.patch("/users/{username}/role")
def change_role(username: str, data: dict):
    """Change user role."""
    from services.auth_service import update_user_role
    return update_user_role(username, data.get("role", ""))


@router.delete("/users/{username}")
def deactivate_user(username: str):
    """Deactivate a user."""
    from services.auth_service import delete_user
    return delete_user(username)


@router.post("/auth/login")
def login(data: dict):
    """Authenticate and get API key."""
    from services.auth_service import authenticate
    user = authenticate(username=data.get("username"), password=data.get("password"))
    if not user:
        return {"success": False, "error": "Invalid credentials"}
    return {
        "success": True,
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "api_key": user.get("api_key", ""),
    }


# ===== System =====

@router.post("/backup")
def backup():
    """Create database backup."""
    import shutil
    from datetime import datetime as _dt
    db_path = os.getenv("DATABASE_URL", "sqlite:///./paragraf.db").replace("sqlite:///", "")
    backup_dir = os.getenv("BACKUP_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups"))
    os.makedirs(backup_dir, exist_ok=True)
    
    ts = _dt.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"paragraf_{ts}.db")
    shutil.copy2(db_path, backup_path)
    
    backups = sorted([f for f in os.listdir(backup_dir) if f.endswith(".db")], reverse=True)
    for old in backups[10:]:
        os.remove(os.path.join(backup_dir, old))
    return {"success": True, "backup": backup_path, "size_mb": round(os.path.getsize(backup_path) / 1024 / 1024, 2)}


@router.get("/usage")
def usage():
    """AI API usage stats."""
    from services.ai_service import get_usage
    from services.rag_service import get_collection_stats
    return {"ai": get_usage(), "rag": get_collection_stats()}


@router.post("/import/excel")
def import_excel(file_path: str = None):
    """Import from Marta's Excel."""
    from services.import_service import import_from_excel
    if not file_path:
        file_path = os.path.expanduser("~/clawd/data/legal/marta_templates/UMOWY_I_ZAMÓWIENIA_do_AI.xlsx")
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}
    db = SessionLocal()
    try:
        return {"success": True, **import_from_excel(file_path, db)}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@router.post("/normalize/clients")
def normalize():
    """Re-run client normalization."""
    from services.normalize_clients import normalize_all_clients
    db = SessionLocal()
    try:
        return {"success": True, **normalize_all_clients(db)}
    finally:
        db.close()


@router.post("/webhook/test")
def webhook_test(url: str, payload: dict = None):
    """Test webhook integration."""
    import requests as _requests
    from datetime import datetime as _dt
    if not payload:
        payload = {"event": "test", "system": "PARAGRAF", "timestamp": _dt.now().isoformat()}
    try:
        r = _requests.post(url, json=payload, timeout=5)
        return {"success": True, "status_code": r.status_code, "response": r.text[:200]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/templates")
def list_templates():
    from services.template_service import list_templates
    return list_templates()


@router.post("/templates/set-default")
def set_default(filename: str):
    from services.template_service import list_templates
    templates = [t["filename"] for t in list_templates()]
    if filename not in templates:
        return {"error": f"Template not found. Available: {templates}"}
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")
    config = {}
    if os.path.exists(config_path):
        with open(config_path) as f: config = json.load(f)
    config["default_template"] = filename
    with open(config_path, "w") as f: json.dump(config, f)
    return {"success": True, "default_template": filename}


@router.get("/templates/{filename}")
def get_template(filename: str):
    from services.template_service import get_template_structure
    return get_template_structure(filename)


@router.get("/templates/{filename}/preview")
def preview_template(filename: str):
    """HTML preview of template."""
    from services.template_service import TEMPLATE_DIR
    from docx import Document as _Doc
    path = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(path):
        return {"error": "Not found"}
    doc = _Doc(path)
    html = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text: continue
        if text.startswith("§") or "UMOWA" in text.upper() or "ZAŁĄCZNIK" in text.upper():
            html.append(f"<h3>{text}</h3>")
        else:
            html.append(f"<p>{text}</p>")
    return {"filename": filename, "html": "\n".join(html), "paragraphs": len(html)}


@router.get("/clauses")
def get_clauses(category: str = None):
    from services.clause_library import list_clauses
    return list_clauses(category)


@router.get("/clauses/{clause_id}")
def get_clause(clause_id: str):
    from services.clause_library import get_clause
    return get_clause(clause_id)


@router.get("/activity")
def activity_feed(limit: int = 20):
    """Recent audit log."""
    db = SessionLocal()
    logs = db.query(ContractAuditLog, Contract.number, Contract.contractor_name).join(
        Contract, ContractAuditLog.contract_id == Contract.id
    ).order_by(ContractAuditLog.created_at.desc()).limit(limit).all()
    db.close()
    
    labels = {"created": "Umowa utworzona", "status_changed": "Zmiana statusu",
              "annex_created": "Aneks", "terminated": "Rozwiązana", "email_sent": "Email",
              "full_review": "Przegląd AI", "imported": "Import", "cloned": "Sklonowana"}
    
    return [{"id": log.id, "contract_number": num, "contractor": name,
             "action": labels.get(log.action, log.action), "action_raw": log.action,
             "details": json.loads(log.details) if log.details else {},
             "user": log.user, "timestamp": log.created_at.isoformat() if log.created_at else None}
            for log, num, name in logs]


@router.get("/nip/{nip}")
def lookup_nip(nip: str):
    from services.regon_service import lookup_by_nip
    return lookup_by_nip(nip) or {"error": "Not found"}


@router.get("/cities")
def cities():
    db = SessionLocal()
    result = sorted(set(c[0] for c in db.query(Contract.client_city).filter(
        Contract.client_city != "", Contract.client_city != None).distinct().limit(50).all() if c[0]))
    db.close()
    return result


@router.get("/contract-roles")
def contract_roles(limit: int = 30):
    db = SessionLocal()
    result = db.query(Contract.role, func.count(Contract.id).label("cnt")).filter(
        Contract.role != ""
    ).group_by(Contract.role).order_by(func.count(Contract.id).desc()).limit(limit).all()
    db.close()
    return [{"role": r[0], "count": r[1]} for r in result]


@router.get("/contractors/search")
def search_contractors(q: str, limit: int = 10):
    db = SessionLocal()
    result = db.query(Contract.contractor_name, Contract.contractor_company, Contract.contractor_nip).filter(
        Contract.contractor_name.ilike(f"%{q}%")
    ).distinct().limit(limit).all()
    db.close()
    return [{"name": c[0], "company": c[1], "nip": c[2]} for c in result]


@router.get("/contractor/{name}")
def contractor_profile(name: str):
    import urllib.parse
    name_decoded = urllib.parse.unquote(name)
    db = SessionLocal()
    contracts = db.query(Contract).filter(Contract.contractor_name == name_decoded).order_by(
        Contract.created_at.desc()).all()
    if not contracts:
        contracts = db.query(Contract).filter(Contract.contractor_name.ilike(f"%{name_decoded}%")).limit(20).all()
    db.close()
    if not contracts: return {"error": "Not found"}
    rates = [c.rate for c in contracts if c.rate and c.rate > 0]
    return {
        "name": contracts[0].contractor_name, "company": contracts[0].contractor_company,
        "nip": contracts[0].contractor_nip, "total_contracts": len(contracts),
        "active_contracts": sum(1 for c in contracts if c.status == "aktywna"),
        "avg_rate": round(sum(rates) / len(rates), 2) if rates else 0,
        "clients": list(set(c.client for c in contracts if c.client)),
        "contracts": [{"id": c.id, "number": c.number, "client": c.client, "role": c.role,
                        "rate": c.rate, "status": c.status, "start_date": c.start_date} for c in contracts],
    }


@router.get("/clients")
def clients():
    db = SessionLocal()
    result = [c[0] for c in db.query(Contract.client).distinct().all()]
    db.close()
    return result


@router.get("/search")
def global_search(q: str, limit: int = 20):
    """Search across contracts + legal."""
    db = SessionLocal()
    search = f"%{q}%"
    contracts = db.query(Contract).filter(or_(
        Contract.contractor_name.ilike(search), Contract.contractor_company.ilike(search),
        Contract.client.ilike(search), Contract.number.ilike(search),
        Contract.role.ilike(search), Contract.project_description.ilike(search),
    )).limit(limit).all()
    db.close()
    
    legal = search_legal_context(q, n_results=3)
    return {
        "query": q,
        "contracts": [{"id": c.id, "number": c.number, "name": c.contractor_name,
                        "client": c.client, "role": c.role, "status": c.status} for c in contracts],
        "legal": [l[:200] for l in legal],
        "total_contracts": len(contracts), "total_legal": len(legal),
    }


@router.get("/search-suggestions")
def search_suggestions():
    db = SessionLocal()
    top_clients = [r[0] for r in db.query(Contract.client).filter(Contract.client != "").group_by(
        Contract.client).order_by(func.count(Contract.id).desc()).limit(5).all()]
    top_areas = [r[0] for r in db.query(Contract.it_area).filter(Contract.it_area != "").group_by(
        Contract.it_area).order_by(func.count(Contract.id).desc()).limit(5).all()]
    db.close()
    return {"clients": top_clients, "areas": top_areas,
            "quick": ["aktywne Nordea", "java developer", "devops engineer", "tester BNP", "do podpisu"]}


@router.get("/calculator/earnings")
def earnings_calc(rate: float, hours_per_month: int = 168, months: int = 12):
    monthly = rate * hours_per_month
    margin = 15
    client_rate = rate * (1 + margin / 100)
    return {
        "contractor": {"rate_per_hour": rate, "monthly": round(monthly, 2), "annual": round(monthly * months, 2)},
        "client_estimate": {"rate_per_hour": round(client_rate, 2), "monthly_revenue": round(client_rate * hours_per_month, 2)},
        "margin": {"monthly": round((client_rate - rate) * hours_per_month, 2), "annual": round((client_rate - rate) * hours_per_month * months, 2), "pct": margin},
    }
