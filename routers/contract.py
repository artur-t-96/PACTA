from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from io import BytesIO

import config
from services.document_generator import DocumentGenerator

router = APIRouter(tags=["contract"])


class ContractData(BaseModel):
    # Typ umowy
    typ_umowy: str = Field(..., description="z_dzialalnoscia lub bez_dzialalnosci")
    
    # Dane partnera
    imie_nazwisko: str = Field(..., min_length=3)
    plec: str = Field(..., description="mezczyzna lub kobieta")
    telefon: str
    email: str
    
    # Dane firmy (dla typu z_dzialalnoscia)
    nazwa_firmy: Optional[str] = None
    adres_firmy: Optional[str] = None
    kod_pocztowy: Optional[str] = None
    miasto: Optional[str] = None
    nip: Optional[str] = None
    regon: Optional[str] = None
    
    # Dane osobowe (dla typu bez_dzialalnosci)
    adres_zamieszkania: Optional[str] = None
    nr_dowodu: Optional[str] = None
    pesel: Optional[str] = None
    
    # Warunki umowy
    numer_umowy: str
    specjalizacja: str
    stawka_godzinowa: str
    stawka_slownie: str
    czas_umowy: str = Field(..., description="nieokreslony lub data")
    data_konca_umowy: Optional[str] = None
    okres_wypowiedzenia: str = "1 miesiąca"
    data_rozpoczecia: str
    
    # Klient projektu (załącznik 3)
    klient_nazwa: str
    klient_adres: str
    klient_opis: Optional[str] = ""
    klient_data_rozpoczecia: str


def verify_session(request: Request):
    """Sprawdza czy użytkownik jest zalogowany"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        raise HTTPException(status_code=401, detail="Nie zalogowano")


@router.post("/generate")
async def generate_contract(data: ContractData, request: Request):
    """
    Generuje umowę B2B na podstawie danych z formularza.
    
    Zwraca plik DOCX do pobrania.
    """
    verify_session(request)
    
    # Walidacja danych dla typu umowy
    if data.typ_umowy == "z_dzialalnoscia":
        if not all([data.nazwa_firmy, data.adres_firmy, data.nip]):
            raise HTTPException(
                status_code=400, 
                detail="Dla umowy z działalnością wymagane są dane firmy"
            )
    else:
        if not all([data.adres_zamieszkania, data.nr_dowodu, data.pesel]):
            raise HTTPException(
                status_code=400, 
                detail="Dla umowy bez działalności wymagane są dane osobowe"
            )
    
    # Generowanie dokumentu
    generator = DocumentGenerator()
    
    try:
        doc_buffer = generator.generate(data.model_dump())
        
        # Przygotowanie nazwy pliku
        safe_name = data.imie_nazwisko.replace(" ", "_")
        filename = f"Umowa_B2B_{safe_name}.docx"
        
        return StreamingResponse(
            BytesIO(doc_buffer),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania umowy: {str(e)}")
