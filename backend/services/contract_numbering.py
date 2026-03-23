"""
Contract number generation — incremental XXX/2026 format
"""
import re
from datetime import datetime
from sqlalchemy.orm import Session
from database import Contract


def generate_contract_number(db: Session) -> str:
    """
    Generate next contract number in format XXX/YYYY.
    Finds the highest existing number and increments.
    """
    year = datetime.now().year
    pattern = f"/%d" % year
    
    # Get all contracts for this year
    contracts = db.query(Contract).filter(
        Contract.number.like(f"%/{year}")
    ).all()
    
    max_num = 0
    for c in contracts:
        match = re.match(r'^(\d+)/', c.number)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    
    next_num = max_num + 1
    return f"{next_num:03d}/{year}"
