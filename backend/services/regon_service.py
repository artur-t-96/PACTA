"""
REGON GUS API service — enrich contractor data from NIP/REGON
Uses public GUS REGON API (no key required for basic lookup)
"""
import requests
from typing import Optional


def lookup_by_nip(nip: str) -> Optional[dict]:
    """
    Look up company data by NIP using public GUS API.
    Returns basic company data or None.
    
    Note: Full REGON API requires API key from GUS (stat.gov.pl).
    This uses the free BIR1 endpoint for basic data.
    """
    nip_clean = nip.replace("-", "").replace(" ", "").strip()
    if len(nip_clean) != 10:
        return None
    
    # Try wyszukiwarkaregon.stat.gov.pl (public, no key needed for basic search)
    # Note: full data requires registration at https://api.stat.gov.pl/regon
    
    # Alternative: rejestr.io (free tier)
    try:
        r = requests.get(
            f"https://rejestr.io/api/v2/krs/nip/{nip_clean}",
            timeout=5,
            headers={"User-Agent": "PARAGRAF/2.0 B2Bnet"}
        )
        if r.status_code == 200:
            data = r.json()
            return {
                "source": "rejestr.io",
                "nip": nip_clean,
                "name": data.get("name", ""),
                "regon": data.get("regon", ""),
                "address": _format_address(data),
                "krs": data.get("krs", ""),
                "status": data.get("status", ""),
            }
    except Exception:
        pass
    
    # Fallback: try KRS search
    try:
        r = requests.get(
            f"https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/{nip_clean}",
            params={"rejestr": "P", "format": "json"},
            timeout=5,
        )
        if r.status_code == 200:
            data = r.json()
            return {
                "source": "krs.ms.gov.pl",
                "nip": nip_clean,
                "name": data.get("naglowekA", {}).get("pelnaNazwa", ""),
                "regon": "",
                "address": "",
                "krs": "",
            }
    except Exception:
        pass
    
    return {"nip": nip_clean, "source": "not_found", "error": "Company data unavailable"}


def _format_address(data: dict) -> str:
    """Format address from rejestr.io response."""
    parts = []
    if data.get("street"):
        parts.append(f"ul. {data['street']}")
    if data.get("building"):
        parts.append(str(data["building"]))
    if data.get("postal_code") and data.get("city"):
        parts.append(f"{data['postal_code']} {data['city']}")
    return ", ".join(parts) if parts else ""
