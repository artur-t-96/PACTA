"""
PARAGRAF v7.0 — Tests for new endpoints
"""
import requests

BASE = "http://localhost:8001/api"


def test_overview():
    r = requests.get(f"{BASE}/overview")
    assert r.status_code == 200
    d = r.json()
    assert d["version"] == "7.0.0"
    assert d["total"] > 0
    assert d["endpoints"] == 100


def test_system_info():
    r = requests.get(f"{BASE}/system-info")
    assert r.status_code == 200
    assert r.json()["system"] == "PARAGRAF"


def test_funnel():
    r = requests.get(f"{BASE}/funnel")
    assert r.status_code == 200
    d = r.json()
    assert len(d["funnel"]) == 5


def test_batch_quality():
    r = requests.get(f"{BASE}/batch-quality")
    assert r.status_code == 200
    d = r.json()
    assert d["total_checked"] > 0
    assert d["clean"] + d["with_issues"] == d["total_checked"]


def test_onboard():
    r = requests.post(f"{BASE}/contracts/onboard", json={
        "imie": "V7", "nazwisko": "Test",
        "firma": "V7 Test sp. z o.o.", "nip": "7777777777",
        "adres": "ul. V7 1, Warszawa", "email": "v7@test.pl",
        "tel": "+48 777 777 777", "rola": "QA Engineer",
        "stawka": 130, "klient": "Nordea Bank Abp S.A. Oddział w Polsce",
        "data_startu": "2026-08-01", "obszar_it": "testing",
        "miasto_klienta": "Gdańsk",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["success"] == True
    assert d["status"] == "do_podpisu"
    assert len(d["steps"]) >= 4


def test_markdown():
    contracts = requests.get(f"{BASE}/contracts?limit=1").json()
    if contracts:
        r = requests.get(f"{BASE}/contracts/{contracts[0]['id']}/markdown")
        assert r.status_code == 200
        assert "# Umowa" in r.json()["markdown"]


def test_clauses():
    r = requests.get(f"{BASE}/clauses")
    assert r.status_code == 200
    assert len(r.json()) >= 8


def test_ksef():
    r = requests.get(f"{BASE}/ksef-readiness")
    assert r.status_code == 200
    d = r.json()
    assert "readiness_pct" in d


def test_seasonal():
    r = requests.get(f"{BASE}/analytics/seasonal")
    assert r.status_code == 200
    d = r.json()
    assert d["busiest"] != ""


def test_velocity():
    r = requests.get(f"{BASE}/analytics/velocity")
    assert r.status_code == 200


def test_recruiters():
    r = requests.get(f"{BASE}/analytics/recruiters")
    assert r.status_code == 200
    d = r.json()
    assert len(d) > 0


def test_duplicates():
    r = requests.get(f"{BASE}/analytics/potential-duplicates")
    assert r.status_code == 200


def test_contractor_profile():
    r = requests.get(f"{BASE}/contractor/Jan%20Kowalski")
    assert r.status_code == 200
    d = r.json()
    assert d["name"] == "Jan Kowalski"


def test_available_contractors():
    r = requests.get(f"{BASE}/available-contractors")
    assert r.status_code == 200
    assert r.json()["total"] > 0


def test_financial_summary():
    r = requests.get(f"{BASE}/financial-summary")
    assert r.status_code == 200
    assert "total_monthly_cost" in r.json()


def test_yoy():
    r = requests.get(f"{BASE}/analytics/yoy")
    assert r.status_code == 200


def test_forecast():
    r = requests.get(f"{BASE}/analytics/forecast")
    assert r.status_code == 200
    d = r.json()
    assert d["forecast_eoy"] > 0


def test_weekly_report():
    r = requests.get(f"{BASE}/report/weekly")
    assert r.status_code == 200
    assert "markdown" in r.json()


def test_client_ranking():
    r = requests.get(f"{BASE}/analytics/client-ranking")
    assert r.status_code == 200


def test_quick_summary():
    r = requests.get(f"{BASE}/stats/summary")
    assert r.status_code == 200
    assert "PARAGRAF" in r.json()["text"]


def test_auth_login():
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    d = r.json()
    assert d["success"] == True
    assert d["role"] == "admin"
    assert len(d["api_key"]) > 10


def test_auth_invalid():
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 200
    assert r.json()["success"] == False


def test_users_list():
    r = requests.get(f"{BASE}/users")
    assert r.status_code == 200
    users = r.json()
    assert len(users) >= 3
    assert any(u["username"] == "admin" for u in users)


def test_roles_list():
    r = requests.get(f"{BASE}/roles")
    assert r.status_code == 200
    d = r.json()
    assert "admin" in d
    assert "recruiter" in d


def test_pending():
    r = requests.get(f"{BASE}/pending")
    assert r.status_code == 200
    d = r.json()
    assert "do_podpisu_count" in d
    assert "drafts_count" in d
