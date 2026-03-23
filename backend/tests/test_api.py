"""
PARAGRAF — pytest API tests
"""
import pytest
import requests

BASE = "http://localhost:8001"
API = f"{BASE}/api"


class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_root(self):
        r = requests.get(BASE)
        assert r.status_code == 200
        assert r.json()["system"] == "PARAGRAF"


class TestContracts:
    def test_list(self):
        r = requests.get(f"{API}/contracts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_with_query(self):
        r = requests.get(f"{API}/contracts?q=Nordea")
        assert r.status_code == 200
        for c in r.json():
            assert "nordea" in c["client"].lower() or "nordea" in c["contractor_name"].lower()

    def test_list_with_status(self):
        r = requests.get(f"{API}/contracts?status=aktywna")
        assert r.status_code == 200
        for c in r.json():
            assert c["status"] == "aktywna"

    def test_get_contract(self):
        # Get first contract
        contracts = requests.get(f"{API}/contracts?limit=1").json()
        if contracts:
            cid = contracts[0]["id"]
            r = requests.get(f"{API}/contracts/{cid}")
            assert r.status_code == 200
            assert r.json()["id"] == cid

    def test_get_nonexistent(self):
        r = requests.get(f"{API}/contracts/99999")
        assert r.status_code == 404

    def test_stats(self):
        r = requests.get(f"{API}/contracts/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "avg_rate" in data
        assert "by_client" in data
        assert data["total"] > 0


class TestGenerate:
    def test_generate_valid(self):
        r = requests.post(f"{API}/contracts/generate", json={
            "imie": "Pytest",
            "nazwisko": "Testowy",
            "firma": "Pytest Testing sp. z o.o.",
            "nip": "1234567890",
            "adres": "ul. Testowa 1, 00-001 Warszawa",
            "email": "pytest@test.pl",
            "tel": "+48 111 222 333",
            "rola": "QA Engineer",
            "stawka": 120.0,
            "klient": "Test Client S.A.",
            "data_startu": "2026-06-01",
            "obszar_it": "selenium testing",
            "miasto_klienta": "Warszawa",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["success"] == True
        assert "/2026" in data["contract"]["number"]
        
    def test_generate_bad_nip(self):
        r = requests.post(f"{API}/contracts/generate", json={
            "imie": "Bad", "nazwisko": "Nip",
            "firma": "X", "nip": "123",
            "adres": "ul. X 1", "email": "x@x.pl",
            "tel": "123", "rola": "Dev", "stawka": 100,
            "klient": "Y", "data_startu": "2026-01-01",
            "obszar_it": "dev", "miasto_klienta": "W",
        })
        assert r.status_code == 422  # Validation error

    def test_generate_bad_rate(self):
        r = requests.post(f"{API}/contracts/generate", json={
            "imie": "Bad", "nazwisko": "Rate",
            "firma": "X", "nip": "1234567890",
            "adres": "ul. X 1", "email": "x@x.pl",
            "tel": "123", "rola": "Dev", "stawka": 99999,
            "klient": "Y", "data_startu": "2026-01-01",
            "obszar_it": "dev", "miasto_klienta": "W",
        })
        assert r.status_code == 422


class TestStatusFlow:
    @pytest.fixture
    def draft_contract(self):
        """Create a draft contract for testing."""
        r = requests.post(f"{API}/contracts/generate", json={
            "imie": "Status", "nazwisko": "Test",
            "firma": "Status Test sp. z o.o.", "nip": "9876543210",
            "adres": "ul. Status 1", "email": "status@test.pl",
            "tel": "123", "rola": "Dev", "stawka": 100,
            "klient": "Status Client", "data_startu": "2026-07-01",
            "obszar_it": "java", "miasto_klienta": "Kraków",
        })
        return r.json()["contract"]["id"]

    def test_valid_flow(self, draft_contract):
        cid = draft_contract
        # draft → do_podpisu
        r = requests.patch(f"{API}/contracts/{cid}/status?status=do_podpisu")
        assert r.status_code == 200
        # do_podpisu → aktywna
        r = requests.patch(f"{API}/contracts/{cid}/status?status=aktywna")
        assert r.status_code == 200

    def test_invalid_transition(self, draft_contract):
        cid = draft_contract
        # draft → aktywna (invalid!)
        r = requests.patch(f"{API}/contracts/{cid}/status?status=aktywna")
        assert r.status_code == 400

    def test_cancel(self, draft_contract):
        cid = draft_contract
        r = requests.patch(f"{API}/contracts/{cid}/status?status=anulowana")
        assert r.status_code == 200


class TestRisks:
    def test_check_risks(self):
        contracts = requests.get(f"{API}/contracts?status=draft&limit=1").json()
        if not contracts:
            pytest.skip("No draft contracts")
        cid = contracts[0]["id"]
        
        r = requests.post(f"{API}/contracts/check-risks", json={
            "contract_id": cid,
            "zmiany": [{"paragraf": "§10", "zmiana": "Usunięcie non-compete"}]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["overall_risk"] in ["green", "yellow", "red"]
        assert len(data["risks"]) == 1


class TestExport:
    def test_csv(self):
        r = requests.get(f"{API}/contracts/export/csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]
        lines = r.text.strip().split("\n")
        assert len(lines) > 1  # Header + data
        assert "Numer" in lines[0]

    def test_clients(self):
        r = requests.get(f"{API}/clients")
        assert r.status_code == 200
        clients = r.json()
        assert isinstance(clients, list)
        assert len(clients) > 0


class TestAlerts:
    def test_alerts(self):
        r = requests.get(f"{API}/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "missing_nip" in data
        assert "missing_rate" in data


class TestUsage:
    def test_usage(self):
        r = requests.get(f"{API}/usage")
        assert r.status_code == 200
        data = r.json()
        assert "ai" in data
        assert "rag" in data

class TestLegal:
    def test_search(self):
        r = requests.get(f"{API}/ai/legal-search?q=zakaz+konkurencji")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] > 0
