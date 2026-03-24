"""
Tickets router — recruiter submits requests, operator processes them.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db, Ticket

router = APIRouter(redirect_slashes=False)


def _get_current_user(request: Request) -> dict:
    """Extract current user from request state (set by middleware)."""
    user = getattr(request.state, "current_user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Wymagane logowanie")
    return user


def _require_role(request: Request, *roles: str) -> dict:
    user = _get_current_user(request)
    if user.get("role") not in roles and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    return user


def _ticket_to_dict(t: Ticket) -> dict:
    return {
        "id": t.id,
        "type": t.type,
        "status": t.status,
        "title": t.title,
        "requester_id": t.requester_id,
        "operator_id": t.operator_id,
        "details": json.loads(t.details) if t.details else {},
        "result": json.loads(t.result) if t.result else None,
        "result_file_path": t.result_file_path,
        "seen_by_requester": t.seen_by_requester,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "started_at": t.started_at.isoformat() if t.started_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
    }


@router.post("")
def create_ticket(request: Request, data: dict, db: Session = Depends(get_db)):
    """Recruiter creates a new ticket."""
    user = _require_role(request, "recruiter", "operator", "admin")

    ticket_type = data.get("type")
    if ticket_type not in ("generate_contract", "check_risks", "modify_paragraph"):
        raise HTTPException(status_code=400, detail="Nieprawidłowy typ zgłoszenia")

    title = data.get("title", "").strip()
    if not title:
        # Auto-generate title from type
        labels = {
            "generate_contract": "Generowanie umowy B2B",
            "check_risks": "Weryfikacja ryzyk umowy",
            "modify_paragraph": "Modyfikacja paragrafu",
        }
        title = labels.get(ticket_type, "Zgłoszenie")

    ticket = Ticket(
        type=ticket_type,
        status="pending",
        title=title,
        requester_id=user["username"],
        details=json.dumps(data.get("details", {}), ensure_ascii=False),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _ticket_to_dict(ticket)


@router.get("")
def list_tickets(request: Request, db: Session = Depends(get_db)):
    """
    Operator/admin sees all tickets.
    Recruiter sees only their own.
    """
    user = _get_current_user(request)
    role = user.get("role", "")

    if role in ("operator", "admin", "manager"):
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    else:
        tickets = db.query(Ticket).filter(
            Ticket.requester_id == user["username"]
        ).order_by(Ticket.created_at.desc()).all()

    return [_ticket_to_dict(t) for t in tickets]


@router.get("/unread-count")
def unread_count(request: Request, db: Session = Depends(get_db)):
    """
    For operators: count of pending tickets (new work).
    For recruiters: count of completed tickets not yet seen.
    """
    user = _get_current_user(request)
    role = user.get("role", "")

    if role in ("operator", "admin", "manager"):
        count = db.query(Ticket).filter(Ticket.status == "pending").count()
    else:
        count = db.query(Ticket).filter(
            Ticket.requester_id == user["username"],
            Ticket.status == "completed",
            Ticket.seen_by_requester == False,
        ).count()

    return {"count": count}


@router.get("/{ticket_id}")
def get_ticket(ticket_id: int, request: Request, db: Session = Depends(get_db)):
    """Get ticket details."""
    user = _get_current_user(request)
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Zgłoszenie nie istnieje")

    # Recruiter can only see their own
    if user.get("role") == "recruiter" and ticket.requester_id != user["username"]:
        raise HTTPException(status_code=403, detail="Brak dostępu")

    return _ticket_to_dict(ticket)


@router.patch("/{ticket_id}/status")
def update_ticket_status(ticket_id: int, request: Request, data: dict, db: Session = Depends(get_db)):
    """Operator updates ticket status: pending → in_progress → completed."""
    user = _require_role(request, "operator", "admin")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Zgłoszenie nie istnieje")

    new_status = data.get("status")
    if new_status not in ("pending", "in_progress", "completed"):
        raise HTTPException(status_code=400, detail="Nieprawidłowy status")

    ticket.status = new_status
    ticket.operator_id = user["username"]

    if new_status == "in_progress" and not ticket.started_at:
        ticket.started_at = datetime.utcnow()
    elif new_status == "completed":
        ticket.completed_at = datetime.utcnow()
        ticket.seen_by_requester = False  # reset so recruiter gets notification

    db.commit()
    db.refresh(ticket)
    return _ticket_to_dict(ticket)


@router.patch("/{ticket_id}/result")
def attach_result(ticket_id: int, request: Request, data: dict, db: Session = Depends(get_db)):
    """Operator attaches result to ticket and marks as completed."""
    user = _require_role(request, "operator", "admin")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Zgłoszenie nie istnieje")

    ticket.result = json.dumps(data.get("result", {}), ensure_ascii=False)
    ticket.result_file_path = data.get("result_file_path")
    ticket.status = "completed"
    ticket.operator_id = user["username"]
    ticket.completed_at = datetime.utcnow()
    ticket.seen_by_requester = False

    if not ticket.started_at:
        ticket.started_at = datetime.utcnow()

    db.commit()
    db.refresh(ticket)
    return _ticket_to_dict(ticket)


@router.patch("/{ticket_id}/seen")
def mark_seen(ticket_id: int, request: Request, db: Session = Depends(get_db)):
    """Recruiter marks a completed ticket as seen (clears notification badge)."""
    user = _get_current_user(request)
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Zgłoszenie nie istnieje")

    if ticket.requester_id != user["username"] and user.get("role") not in ("admin", "operator"):
        raise HTTPException(status_code=403, detail="Brak dostępu")

    ticket.seen_by_requester = True
    db.commit()
    return {"success": True}
