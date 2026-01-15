import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

import config
from services.ceidg_client import CEIDGClient

router = APIRouter(tags=["ceidg"])
logger = logging.getLogger(__name__)


def verify_session(request: Request):
    """Sprawdza czy użytkownik jest zalogowany"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        raise HTTPException(status_code=401, detail="Nie zalogowano")


@router.get("/ceidg/status")
async def get_ceidg_status(request: Request):
    """
    Sprawdza status konfiguracji CEIDG API.
    Endpoint diagnostyczny do debugowania.
    """
    verify_session(request)

    has_api_key = bool(config.CEIDG_API_KEY)
    api_key_preview = f"{config.CEIDG_API_KEY[:20]}..." if has_api_key else "NOT SET"

    return JSONResponse(content={
        "api_key_configured": has_api_key,
        "api_key_preview": api_key_preview,
        "api_url": config.CEIDG_API_URL,
        "mode": "production" if has_api_key else "demo"
    })


@router.get("/ceidg/{nip}")
async def get_company_data(nip: str, request: Request):
    """
    Pobiera dane firmy z CEIDG na podstawie NIP.

    UWAGA: CEIDG zawiera tylko jednoosobowe działalności gospodarcze (JDG).
    Spółki (sp. z o.o., S.A., itp.) są w KRS, nie w CEIDG.

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

    logger.info(f"CEIDG lookup request for NIP: {nip_clean}")
    logger.info(f"API key configured: {bool(config.CEIDG_API_KEY)}")

    # Pobieranie danych z CEIDG
    client = CEIDGClient()
    try:
        data = await client.get_by_nip(nip_clean)
        if not data:
            logger.warning(f"No company found for NIP {nip_clean}")
            raise HTTPException(
                status_code=404,
                detail="Nie znaleziono firmy o podanym NIP w CEIDG. Uwaga: CEIDG zawiera tylko jednoosobowe działalności gospodarcze (JDG). Jeśli szukasz spółki (sp. z o.o., S.A.), sprawdź w KRS."
            )
        logger.info(f"Found company: {data.get('nazwa', 'Unknown')}")
        return JSONResponse(content=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CEIDG API error: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Błąd połączenia z CEIDG: {str(e)}")
