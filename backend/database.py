"""
Database setup — SQLite via SQLAlchemy
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean
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


class Ticket(Base):
    """Ticket submitted by recruiter, processed by operator."""
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100))  # generate_contract, check_risks, modify_paragraph
    status = Column(String(50), default="pending")  # pending, in_progress, completed
    title = Column(String(300))
    requester_id = Column(String(100), index=True)  # username of recruiter
    operator_id = Column(String(100), nullable=True)  # username of operator who processed it
    details = Column(Text)  # JSON with type-specific request data
    result = Column(Text, nullable=True)  # JSON result from operator
    result_file_path = Column(String(500), nullable=True)  # path to output file if any
    seen_by_requester = Column(Boolean, default=False)  # for notification badge
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
