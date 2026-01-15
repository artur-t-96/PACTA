import httpx
import logging
from typing import Optional, Dict, Any

import config

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CEIDGClient:
    """Klient do komunikacji z API CEIDG"""

    def __init__(self):
        self.api_url = config.CEIDG_API_URL
        self.api_key = config.CEIDG_API_KEY
        logger.info(f"CEIDGClient initialized with URL: {self.api_url}")
        logger.info(f"API key configured: {'Yes' if self.api_key else 'No'}")

    async def get_by_nip(self, nip: str) -> Optional[Dict[str, Any]]:
        """
        Pobiera dane firmy z CEIDG na podstawie NIP.

        Args:
            nip: Numer NIP (10 cyfr, bez kresek)

        Returns:
            Słownik z danymi firmy lub None jeśli nie znaleziono
        """

        logger.info(f"Searching for NIP: {nip}")

        # Jeśli brak klucza API, użyj danych demo
        if not self.api_key:
            logger.warning("No API key configured, using demo data")
            return await self._get_demo_data(nip)

        # Prawdziwe zapytanie do CEIDG API
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

        # URL do wyszukiwania
        search_url = f"{self.api_url}/firmy"
        logger.info(f"Making request to: {search_url}?nip={nip}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    search_url,
                    params={"nip": nip},
                    headers=headers,
                    timeout=10.0
                )

                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")

                # Loguj treść odpowiedzi dla debugowania
                response_text = response.text
                logger.info(f"Response body: {response_text[:500] if len(response_text) > 500 else response_text}")

                if response.status_code == 404:
                    logger.info(f"NIP {nip} not found in CEIDG")
                    return None

                if response.status_code == 401:
                    logger.error("Authentication failed - check API key")
                    raise Exception("Błąd uwierzytelnienia - sprawdź klucz API")

                if response.status_code == 403:
                    logger.error("Access denied - API key may not have permissions")
                    raise Exception("Brak dostępu - sprawdź uprawnienia klucza API")

                response.raise_for_status()
                data = response.json()

                logger.info(f"Parsed JSON response: {data}")

                # Parsowanie odpowiedzi CEIDG
                if data.get("firmy") and len(data["firmy"]) > 0:
                    firma = data["firmy"][0]
                    logger.info(f"Found company: {firma.get('nazwa', 'Unknown')}")
                    return self._parse_ceidg_response(firma)

                # Sprawdź alternatywne struktury odpowiedzi
                if isinstance(data, list) and len(data) > 0:
                    logger.info("Response is a list, using first item")
                    return self._parse_ceidg_response(data[0])

                if data.get("firma"):
                    logger.info("Response has 'firma' key (singular)")
                    return self._parse_ceidg_response(data["firma"])

                logger.warning(f"No company found for NIP {nip} in response")
                return None

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Błąd API CEIDG: {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error(f"Request error: {str(e)}")
                raise Exception(f"Błąd połączenia z CEIDG: {str(e)}")
    
    def _parse_ceidg_response(self, firma: Dict) -> Dict[str, Any]:
        """Parsuje odpowiedź z CEIDG do ustandaryzowanego formatu"""
        
        # Wyciąganie danych adresowych
        adres = firma.get("adresDzialalnosci", {})
        wlasciciel = firma.get("wlasciciel", {})
        
        return {
            "nazwa": firma.get("nazwa", ""),
            "imie": wlasciciel.get("imie", ""),
            "nazwisko": wlasciciel.get("nazwisko", ""),
            "adres": f"{adres.get('ulica', '')} {adres.get('budynek', '')}/{adres.get('lokal', '')}".strip(),
            "kod_pocztowy": adres.get("kodPocztowy", ""),
            "miasto": adres.get("miasto", ""),
            "regon": firma.get("regon", ""),
            "status": firma.get("status", "AKTYWNY")
        }
    
    async def _get_demo_data(self, nip: str) -> Optional[Dict[str, Any]]:
        """
        Zwraca dane demo dla testów (gdy brak klucza API).
        W produkcji należy podać prawdziwy klucz CEIDG_API_KEY.
        """
        
        # Przykładowe dane demo dla różnych NIP-ów
        demo_data = {
            "1234567890": {
                "nazwa": "Jan Kowalski Software Development",
                "imie": "Jan",
                "nazwisko": "Kowalski",
                "adres": "ul. Marszałkowska 100/10",
                "kod_pocztowy": "00-001",
                "miasto": "Warszawa",
                "regon": "123456789",
                "status": "AKTYWNY"
            },
            "9876543210": {
                "nazwa": "Anna Nowak IT Solutions",
                "imie": "Anna",
                "nazwisko": "Nowak",
                "adres": "ul. Długa 15",
                "kod_pocztowy": "31-001",
                "miasto": "Kraków",
                "regon": "987654321",
                "status": "AKTYWNY"
            },
            "5555555555": {
                "nazwa": "Piotr Wiśniewski DevOps",
                "imie": "Piotr",
                "nazwisko": "Wiśniewski",
                "adres": "ul. Świętojańska 50/5",
                "kod_pocztowy": "81-391",
                "miasto": "Gdynia",
                "regon": "555555555",
                "status": "AKTYWNY"
            }
        }
        
        return demo_data.get(nip)
