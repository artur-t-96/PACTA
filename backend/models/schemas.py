"""
Pydantic schemas for request/response models
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class ContractGenerateRequest(BaseModel):
    imie: str
    nazwisko: str
    firma: str
    nip: str
    regon: Optional[str] = ""
    adres: str
    email: str
    tel: str
    rola: str
    stawka: float
    klient: str
    data_startu: str  # format: YYYY-MM-DD or DD.MM.YYYY
    obszar_it: str
    opis_projektu: Optional[str] = ""
    miasto_klienta: str
    typ_umowy: Optional[str] = "B2B"  # B2B or Zlecenie
    data_zakonczenia: Optional[str] = ""  # Optional end date YYYY-MM-DD
    okres_wypowiedzenia: Optional[int] = 30  # Notice period in days

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str) -> str:
        nip_clean = v.replace("-", "").replace(" ", "")
        if len(nip_clean) != 10 or not nip_clean.isdigit():
            raise ValueError("NIP musi mieć 10 cyfr")
        return nip_clean

    @field_validator("stawka")
    @classmethod
    def validate_stawka(cls, v: float) -> float:
        if v < 10 or v > 5000:
            raise ValueError("Stawka musi być między 10 a 5000 PLN/h")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v:
            raise ValueError("Nieprawidłowy adres email")
        return v


class ContractChange(BaseModel):
    paragraf: str  # np. "§10 ust.1"
    zmiana: str    # np. "12 miesięcy → 6 miesięcy"


class ContractModifyRequest(BaseModel):
    contract_id: int
    zmiany: List[ContractChange]


class ContractRiskRequest(BaseModel):
    contract_id: int
    zmiany: List[ContractChange]


class RiskItem(BaseModel):
    paragraf: str
    zmiana: str
    ryzyko: str          # green / yellow / red
    uzasadnienie: str
    przepisy: Optional[List[str]] = []


class ContractResponse(BaseModel):
    id: int
    number: str
    contractor_name: str
    contractor_company: str
    contractor_nip: str
    client: str
    role: str
    rate: float
    it_area: str
    start_date: str
    status: str
    file_path: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ContractDetailResponse(ContractResponse):
    contractor_firstname: str
    contractor_lastname: str
    contractor_regon: Optional[str]
    contractor_address: str
    contractor_email: str
    contractor_phone: str
    it_area_raw: Optional[str]
    project_description: Optional[str]
    client_city: str


class GenerateResponse(BaseModel):
    success: bool
    contract: ContractDetailResponse
    message: str
    it_area_standardized: str


class ModifyDiff(BaseModel):
    paragraf: str
    before: str
    after: str


class ModifyResponse(BaseModel):
    success: bool
    contract_id: int
    diffs: List[ModifyDiff]
    file_path: str
    message: str


class RiskResponse(BaseModel):
    success: bool
    contract_id: int
    risks: List[RiskItem]
    overall_risk: str  # green / yellow / red
