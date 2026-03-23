"""
Normalize client names in the database.
"""
from sqlalchemy.orm import Session
from database import Contract


CLIENT_NORMALIZATION = {
    "BNP": "BNP Paribas Bank Polska S.A.",
    "BNP Paribas": "BNP Paribas Bank Polska S.A.",
    "BNP/NORDEA": "BNP Paribas Bank Polska S.A.",
    "Nordea": "Nordea Bank Abp S.A. Oddział w Polsce",
    "Nordra": "Nordea Bank Abp S.A. Oddział w Polsce",
    "Nordea/B2B.NET": "Nordea Bank Abp S.A. Oddział w Polsce",
    "Nordea/BIK": "Nordea Bank Abp S.A. Oddział w Polsce",
    "PKO": "PKO Bank Polski S.A.",
    "PKO BP": "PKO Bank Polski S.A.",
    "Alior": "Alior Bank S.A.",
    "Alior Bank": "Alior Bank S.A.",
    "Bosch": "Robert Bosch sp. z o.o.",
    "BOSCH": "Robert Bosch sp. z o.o.",
    "BOSCH/Nordea": "Robert Bosch sp. z o.o.",
    "Velobank": "VeloBank S.A.",
    "VeloBank": "VeloBank S.A.",
    "Polkomtel": "Polkomtel sp. z o.o.",
    "B2B.NET": "B2B.net S.A.",
    "B2B net": "B2B.net S.A.",
    "B2B": "B2B.net S.A.",
    "ERGO": "ERGO Hestia S.A.",
    "Ergo": "ERGO Hestia S.A.",
    "mleasing": "mLeasing S.A.",
    "Mleasing": "mLeasing S.A.",
    "eZdrowie": "Centrum e-Zdrowia",
    "PFRON": "PFRON",
    "KENJA": "Kenja",
    "Brak": "",
    "Exevator/Bosch": "Robert Bosch sp. z o.o.",
    "NORI.ZK": "NORI ZK",
    "SZOK": "SZOK",
    "Empik": "Empik S.A.",
    "Samsung": "Samsung Electronics Polska",
    "Santander": "Santander Bank Polska S.A.",
    "Oracle": "Oracle Polska sp. z o.o.",
    "Orlen": "PKN Orlen S.A.",
}


def normalize_all_clients(db: Session) -> dict:
    """Normalize client names in the database."""
    stats = {"updated": 0, "unchanged": 0}
    
    for old_name, new_name in CLIENT_NORMALIZATION.items():
        contracts = db.query(Contract).filter(Contract.client == old_name).all()
        for c in contracts:
            c.client = new_name
            stats["updated"] += 1
    
    db.commit()
    return stats
