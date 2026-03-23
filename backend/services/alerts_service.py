"""
Alerts service — detect contracts needing attention
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import Contract


def get_expiring_contracts(db: Session, days_ahead: int = 30) -> list:
    """Find contracts ending within N days."""
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    
    contracts = db.query(Contract).filter(
        Contract.status == "aktywna",
        Contract.start_date != "",
        Contract.start_date != None,
    ).all()
    
    expiring = []
    for c in contracts:
        # Check if we have end date info in project_description
        # For now, flag contracts with no activity
        pass
    
    return expiring


def get_contracts_needing_attention(db: Session) -> dict:
    """Get all contracts needing attention."""
    alerts = {
        "missing_nip": [],
        "missing_rate": [],
        "missing_file": [],
        "draft_old": [],
    }
    
    all_contracts = db.query(Contract).filter(Contract.status.in_(["aktywna", "draft", "do_podpisu"])).all()
    
    for c in all_contracts:
        if not c.contractor_nip and c.status == "aktywna":
            alerts["missing_nip"].append({"id": c.id, "number": c.number, "name": c.contractor_name})
        
        if c.rate == 0 and c.status == "aktywna":
            alerts["missing_rate"].append({"id": c.id, "number": c.number, "name": c.contractor_name})
        
        if not c.file_path and c.status != "zakonczona":
            alerts["missing_file"].append({"id": c.id, "number": c.number, "name": c.contractor_name})
        
        if c.status == "draft" and c.created_at:
            age_days = (datetime.utcnow() - c.created_at).days
            if age_days > 7:
                alerts["draft_old"].append({
                    "id": c.id, "number": c.number, "name": c.contractor_name,
                    "age_days": age_days,
                })
    
    return {
        "missing_nip": len(alerts["missing_nip"]),
        "missing_rate": len(alerts["missing_rate"]),
        "missing_file": len(alerts["missing_file"]),
        "draft_old": len(alerts["draft_old"]),
        "details": alerts,
    }
