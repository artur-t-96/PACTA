"""
Traffit ATS Integration — sync candidates/placements with PARAGRAF contracts
https://traffit.com/api

SETUP: Set TRAFFIT_API_KEY and TRAFFIT_BASE_URL in .env
"""
import os
import requests
from typing import Optional

TRAFFIT_BASE_URL = os.getenv("TRAFFIT_BASE_URL", "https://api.traffit.com/v1")
TRAFFIT_API_KEY = os.getenv("TRAFFIT_API_KEY", "")


class TraffitClient:
    def __init__(self):
        self.base_url = TRAFFIT_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {TRAFFIT_API_KEY}",
            "Content-Type": "application/json",
        }
    
    def is_configured(self) -> bool:
        return bool(TRAFFIT_API_KEY)
    
    def get_placements(self, limit: int = 50, page: int = 1) -> Optional[dict]:
        """Get active placements (hired candidates)."""
        if not self.is_configured():
            return {"error": "TRAFFIT_API_KEY not set", "mock": True}
        
        try:
            r = requests.get(
                f"{self.base_url}/placements",
                headers=self.headers,
                params={"limit": limit, "page": page, "status": "active"},
                timeout=10,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
    
    def get_candidate(self, candidate_id: str) -> Optional[dict]:
        """Get candidate details."""
        if not self.is_configured():
            return {"error": "TRAFFIT_API_KEY not set"}
        
        try:
            r = requests.get(
                f"{self.base_url}/candidates/{candidate_id}",
                headers=self.headers,
                timeout=10,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
    
    def sync_to_paragraf(self, db) -> dict:
        """
        Sync Traffit placements to PARAGRAF as contract drafts.
        For each placement, check if contract exists (by name/client), create if not.
        """
        if not self.is_configured():
            return {"error": "Not configured — set TRAFFIT_API_KEY in .env"}
        
        placements = self.get_placements()
        if "error" in placements:
            return placements
        
        # TODO: Map Traffit placement → PARAGRAF contract
        # placement.candidate.name → contractor_name
        # placement.client_name → client
        # placement.position → role
        # placement.start_date → start_date
        # placement.salary → rate (if available)
        
        return {
            "message": "Sync not yet implemented — needs Traffit API endpoint mapping",
            "placements_found": len(placements.get("data", [])),
        }


_client = None

def get_client() -> TraffitClient:
    global _client
    if _client is None:
        _client = TraffitClient()
    return _client
