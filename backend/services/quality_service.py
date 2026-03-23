"""
Data quality service — detect issues in contract database
"""
from database import SessionLocal, Contract
from sqlalchemy import func


def run_quality_check() -> dict:
    """Comprehensive data quality check."""
    db = SessionLocal()
    
    total = db.query(Contract).count()
    
    # Completeness checks
    no_nip = db.query(Contract).filter(
        (Contract.contractor_nip == "") | (Contract.contractor_nip == None),
        Contract.status == "aktywna",
        ~Contract.number.startswith("H-"),
    ).count()
    
    no_email = db.query(Contract).filter(
        (Contract.contractor_email == "") | (Contract.contractor_email == None),
        Contract.status == "aktywna",
        ~Contract.number.startswith("H-"),
    ).count()
    
    no_rate = db.query(Contract).filter(
        (Contract.rate == 0) | (Contract.rate == None),
        Contract.status == "aktywna",
        ~Contract.number.startswith("H-"),
    ).count()
    
    no_file = db.query(Contract).filter(
        (Contract.file_path == "") | (Contract.file_path == None),
        Contract.status != "zakonczona",
        ~Contract.number.startswith("H-"),
    ).count()
    
    # Anomaly checks
    from sqlalchemy import text
    duplicate_numbers = db.execute(text("""
        SELECT number, COUNT(*) as cnt
        FROM contracts
        GROUP BY number
        HAVING cnt > 1
        LIMIT 10
    """)).fetchall()
    
    # Suspicious rates
    zero_rate_active = db.query(Contract).filter(
        Contract.rate == 0,
        Contract.status == "aktywna",
        ~Contract.number.startswith("H-"),
    ).count()
    
    very_high_rate = db.query(Contract).filter(
        Contract.rate > 500,
    ).count()
    
    # Coverage
    new_contracts = db.query(Contract).filter(~Contract.number.startswith("H-")).count()
    historical = db.query(Contract).filter(Contract.number.startswith("H-")).count()
    
    # Quality score (0-100)
    issues = no_nip + no_email + no_rate + no_file
    coverage_score = 100 - min((issues / max(new_contracts, 1)) * 100, 100)
    
    db.close()
    
    return {
        "total_contracts": total,
        "new_contracts": new_contracts,
        "historical_contracts": historical,
        "quality_score": round(coverage_score, 1),
        "issues": {
            "missing_nip": no_nip,
            "missing_email": no_email,
            "missing_rate": no_rate,
            "missing_file": no_file,
            "zero_rate_active": zero_rate_active,
            "very_high_rate": very_high_rate,
            "duplicate_numbers": len(duplicate_numbers),
        },
        "anomalies": {
            "duplicate_numbers": [{"number": r[0], "count": r[1]} for r in duplicate_numbers],
        },
        "recommendations": _generate_recommendations(no_nip, no_email, no_rate, no_file, zero_rate_active),
    }


def _generate_recommendations(no_nip, no_email, no_rate, no_file, zero_rate):
    recs = []
    if no_nip > 0:
        recs.append(f"Uzupełnij NIP dla {no_nip} aktywnych umów — wymagane dla KSeF")
    if no_email > 0:
        recs.append(f"Dodaj email dla {no_email} umów — potrzebny do wysyłki powitalnego maila")
    if no_rate > 0:
        recs.append(f"Uzupełnij stawkę dla {no_rate} umów — brak danych do benchmarku")
    if no_file > 0:
        recs.append(f"Wygeneruj DOCX dla {no_file} umów — brak dokumentu")
    if zero_rate > 0:
        recs.append(f"{zero_rate} aktywnych umów ma stawkę 0 PLN/h")
    return recs
