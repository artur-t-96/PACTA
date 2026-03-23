"""
Database setup — SQLite via SQLAlchemy
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./paragraf.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ContractAuditLog(Base):
    """Audit log for contract changes."""
    __tablename__ = "contract_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, index=True)
    action = Column(String(50))  # created, modified, status_changed, duplicated, risk_checked
    details = Column(Text)  # JSON details
    user = Column(String(100), default="system")
    created_at = Column(DateTime, default=datetime.utcnow)


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, index=True)
    contractor_name = Column(String(200))
    contractor_firstname = Column(String(100))
    contractor_lastname = Column(String(100))
    contractor_company = Column(String(200))
    contractor_nip = Column(String(20))
    contractor_regon = Column(String(20))
    contractor_address = Column(Text)
    contractor_email = Column(String(200))
    contractor_phone = Column(String(50))
    client = Column(String(200))
    role = Column(String(200))
    rate = Column(Float)
    it_area = Column(String(100))
    it_area_raw = Column(String(200))
    project_description = Column(Text)
    client_city = Column(String(200))
    start_date = Column(String(50))
    end_date = Column(String(50))
    notice_period_days = Column(Integer, default=30)  # Notice period
    status = Column(String(50), default="draft")
    file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
