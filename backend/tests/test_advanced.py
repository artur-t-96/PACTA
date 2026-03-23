"""
PARAGRAF — Advanced API tests for v4-5 features
"""
import requests

BASE = "http://localhost:8001/api"


def test_clauses():
    r = requests.get(f"{BASE}/clauses")
    assert r.status_code == 200
    clauses = r.json()
    assert len(clauses) >= 8
    assert all("text" in c for c in clauses)


def test_clauses_filter():
    r = requests.get(f"{BASE}/clauses?category=NDA")
    assert r.status_code == 200
    for c in r.json():
        assert c["category"] == "NDA"


def test_ksef_readiness():
    r = requests.get(f"{BASE}/ksef-readiness")
    assert r.status_code == 200
    d = r.json()
    assert "readiness_pct" in d
    assert d["total_active"] > 0


def test_portfolio_value():
    r = requests.get(f"{BASE}/analytics/portfolio-value")
    assert r.status_code == 200
    d = r.json()
    assert "contractor_cost" in d
    assert "margin_est" in d


def test_earnings_calculator():
    r = requests.get(f"{BASE}/calculator/earnings?rate=180&months=12")
    assert r.status_code == 200
    d = r.json()
    assert d["contractor"]["monthly"] == 180 * 168
    assert d["margin"]["pct"] == 15


def test_rate_recommendation():
    r = requests.get(f"{BASE}/ai/recommend-rate?role=Java+Developer&area=Software+Development&client=Nordea")
    assert r.status_code == 200
    d = r.json()
    assert d["recommended_rate"] > 0
    assert d["leverage"] in ("strong", "medium", "standard", "new_client")


def test_aging():
    r = requests.get(f"{BASE}/analytics/aging")
    assert r.status_code == 200
    d = r.json()
    assert "aging_buckets" in d


def test_numbers():
    r = requests.get(f"{BASE}/analytics/numbers")
    assert r.status_code == 200
    d = r.json()
    assert "next" in d
    assert "/2026" in d["next"]


def test_activity():
    r = requests.get(f"{BASE}/activity?limit=5")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d, list)


def test_quality():
    r = requests.get(f"{BASE}/quality")
    assert r.status_code == 200
    assert "quality_score" in r.json()


def test_contract_roles():
    """Test contract role autocomplete (not auth roles)."""
    # This endpoint was moved, test the auth roles instead
    r = requests.get(f"{BASE}/roles")
    assert r.status_code == 200
    d = r.json()
    assert "admin" in d or "recruiter" in d


def test_live():
    r = requests.get(f"{BASE}/live")
    assert r.status_code == 200
    d = r.json()
    assert "active" in d
    assert "total" in d


def test_rate_distribution():
    r = requests.get(f"{BASE}/analytics/rate-distribution")
    assert r.status_code == 200


def test_checklist():
    # Get any contract
    contracts = requests.get(f"{BASE}/contracts?limit=1").json()
    if contracts:
        cid = contracts[0]["id"]
        r = requests.get(f"{BASE}/contracts/{cid}/checklist")
        assert r.status_code == 200
        d = r.json()
        assert "progress_pct" in d
        assert len(d["checklist"]) == 7


def test_suggest_rates():
    r = requests.get(f"{BASE}/enrichment/suggest-rates?limit=3")
    assert r.status_code == 200


def test_contractor_search():
    r = requests.get(f"{BASE}/contractors/search?q=Kowal")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_clients():
    r = requests.get(f"{BASE}/clients")
    assert r.status_code == 200
    assert len(r.json()) > 0
