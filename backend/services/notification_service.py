"""
Notification service — generate alerts for contract milestones
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import Contract


def get_upcoming_starts(db: Session, days: int = 7) -> list:
    """Contracts starting within N days."""
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    
    contracts = db.query(Contract).filter(
        Contract.status.in_(["draft", "do_podpisu"]),
        Contract.start_date >= today,
        Contract.start_date <= future,
    ).all()
    
    return [
        {
            "id": c.id,
            "number": c.number,
            "contractor": c.contractor_name,
            "client": c.client,
            "role": c.role,
            "start_date": c.start_date,
            "days_until": (datetime.strptime(c.start_date, "%Y-%m-%d") - datetime.now()).days,
            "status": c.status,
            "urgency": "high" if (datetime.strptime(c.start_date, "%Y-%m-%d") - datetime.now()).days <= 3 else "medium",
        }
        for c in contracts
        if c.start_date and len(c.start_date) >= 10
    ]


def get_unsigned_contracts(db: Session) -> list:
    """Contracts in 'do_podpisu' status for more than 3 days."""
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    
    contracts = db.query(Contract).filter(
        Contract.status == "do_podpisu",
    ).all()
    
    overdue = []
    for c in contracts:
        if c.updated_at and c.updated_at < three_days_ago:
            days_waiting = (datetime.utcnow() - c.updated_at).days
            overdue.append({
                "id": c.id,
                "number": c.number,
                "contractor": c.contractor_name,
                "client": c.client,
                "days_waiting": days_waiting,
            })
    
    return overdue


def get_renewal_candidates(db: Session) -> list:
    """Find contracts likely needing renewal based on duration patterns."""
    # Contracts active for > 12 months without end date — might need review
    from datetime import datetime, timedelta
    cutoff = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    
    old_active = db.query(Contract).filter(
        Contract.status == "aktywna",
        Contract.start_date != "",
        Contract.start_date != None,
        Contract.start_date <= cutoff,
        ~Contract.number.startswith("H-"),
    ).all()
    
    return [
        {
            "id": c.id,
            "number": c.number,
            "contractor": c.contractor_name,
            "client": c.client,
            "start_date": c.start_date,
            "months_active": max(1, (datetime.now() - datetime.strptime(c.start_date, "%Y-%m-%d")).days // 30) if c.start_date and len(c.start_date) >= 10 else 0,
            "rate": c.rate,
            "suggestion": "Przegląd warunków po 12+ miesiącach współpracy",
        }
        for c in old_active
        if c.start_date and len(c.start_date) >= 10
    ]


def get_overdue_signatures(db: Session, hours: int = 48) -> list:
    """Get contracts in do_podpisu status for more than N hours."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    overdue = db.query(Contract).filter(
        Contract.status == "do_podpisu",
        Contract.updated_at < cutoff,
    ).all()
    
    return [
        {
            "id": c.id,
            "number": c.number,
            "contractor": c.contractor_name,
            "client": c.client,
            "email": c.contractor_email,
            "hours_waiting": round((datetime.utcnow() - c.updated_at).total_seconds() / 3600, 1) if c.updated_at else 0,
        }
        for c in overdue
    ]


def generate_daily_digest(db: Session) -> dict:
    """Generate a daily digest of contract notifications."""
    upcoming = get_upcoming_starts(db)
    unsigned = get_unsigned_contracts(db)
    
    new_today = db.query(Contract).filter(
        Contract.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0),
    ).count()
    
    active = db.query(Contract).filter(Contract.status == "aktywna").count()
    
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "summary": {
            "active_contracts": active,
            "new_today": new_today,
            "upcoming_starts": len(upcoming),
            "unsigned_overdue": len(unsigned),
        },
        "upcoming_starts": upcoming,
        "unsigned_overdue": unsigned,
    }
