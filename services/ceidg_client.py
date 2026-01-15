import httpx
from typing import Optional, Dict, Any

import config


class CEIDGClient:
    """Klient do komunikacji z API CEIDG"""
    
    def __init__(self):
        self.api_url = config.CEIDG_API_URL
        self.api_key = config.CEIDG_API_KEY
    
    async def get_by_nip(self, nip: str) -> Optional[Dict[str, Any]]:
        """
        Pobiera dane firmy z CEIDG na podstawie NIP.
        
        Args:
            nip: Numer NIP (10 cyfr, bez kresek)
        
        Returns:
            Słownik z danymi firmy lub None jeśli nie znaleziono
        """
        
        # Jeśli brak klucza API, użyj danych demo
        if not self.api_key:
            return await self._get_demo_data(nip)
        
        # Prawdziwe zapytanie do CEIDG API
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/firmy",
                    params={"nip": nip},
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 404:
                    return None
                
                response.raise_for_status()
                data = response.json()
                
                # Parsowanie odpowiedzi CEIDG
                if data.get("firmy") and len(data["firmy"]) > 0:
                    firma = data["firmy"][0]
                    return self._parse_ceidg_response(firma)
                
                return None
                
            except httpx.HTTPStatusError as e:
                raise Exception(f"Błąd API CEIDG: {e.response.status_code}")
            except httpx.RequestError as e:
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
