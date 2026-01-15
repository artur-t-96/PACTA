from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

import config
from services.ceidg_client import CEIDGClient

router = APIRouter(tags=["ceidg"])


def verify_session(request: Request):
    """Sprawdza czy użytkownik jest zalogowany"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        raise HTTPException(status_code=401, detail="Nie zalogowano")


@router.get("/ceidg/{nip}")
async def get_company_data(nip: str, request: Request):
    """
    Pobiera dane firmy z CEIDG na podstawie NIP.
    
    Returns:
        {
            "nazwa": "Nazwa firmy",
            "imie": "Jan",
            "nazwisko": "Kowalski",
            "adres": "ul. Przykładowa 10",
            "kod_pocztowy": "00-001",
            "miasto": "Warszawa",
            "regon": "123456789",
            "status": "AKTYWNY"
        }
    """
    verify_session(request)
    
    # Walidacja NIP
    nip_clean = nip.replace("-", "").replace(" ", "")
    if not nip_clean.isdigit() or len(nip_clean) != 10:
        raise HTTPException(status_code=400, detail="Nieprawidłowy format NIP")
    
    # Pobieranie danych z CEIDG
    client = CEIDGClient()
    try:
        data = await client.get_by_nip(nip_clean)
        if not data:
            raise HTTPException(status_code=404, detail="Nie znaleziono firmy o podanym NIP")
        return JSONResponse(content=data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Błąd połączenia z CEIDG: {str(e)}")
