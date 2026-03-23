"""
PARAGRAF — End-to-end workflow tests
Test the complete contract lifecycle: generate → modify → check risks → sign → annex
"""
import requests
import os

BASE = "http://localhost:8001/api"


def test_full_lifecycle():
    """Test complete contract lifecycle."""
    print("=== Full Lifecycle Test ===")
    
    # 1. Generate contract
    r = requests.post(f"{BASE}/contracts/generate", json={
        "imie": "Lifecycle", "nazwisko": "Test",
        "firma": "LC Testing sp. z o.o.", "nip": "6666666666",
        "adres": "ul. Lifecycle 1, 00-001 Warszawa",
        "email": "lifecycle@test.pl", "tel": "+48 666 666 666",
        "rola": "Senior Python Developer", "stawka": 175.0,
        "klient": "Nordea Bank Abp S.A. Oddział w Polsce",
        "data_startu": "2026-07-01",
        "obszar_it": "python backend",
        "miasto_klienta": "Gdańsk",
    })
    assert r.status_code == 200
    gen = r.json()
    cid = gen["contract"]["id"]
    number = gen["contract"]["number"]
    print(f"  1. ✅ Generated: {number} (id={cid})")
    
    # 2. Check file exists
    file_path = gen["contract"]["file_path"]
    assert os.path.exists(file_path), f"File not found: {file_path}"
    print(f"  2. ✅ DOCX created: {os.path.basename(file_path)}")
    
    # 3. Check quality
    r = requests.get(f"{BASE}/contracts/{cid}/check-quality")
    assert r.status_code == 200
    quality = r.json()
    print(f"  3. ✅ Quality check: {quality['status']} ({quality['issues_count']} issues)")
    
    # 4. Get summary
    r = requests.get(f"{BASE}/contracts/{cid}/summary")
    assert r.status_code == 200
    summary = r.json()
    print(f"  4. ✅ Summary: {summary['summary'][:80]}...")
    
    # 5. Check risks
    r = requests.post(f"{BASE}/contracts/check-risks", json={
        "contract_id": cid,
        "zmiany": [{"paragraf": "§10", "zmiana": "Skrócenie non-compete do 3 miesięcy"}],
    })
    assert r.status_code == 200
    risks = r.json()
    print(f"  5. ✅ Risk check: {risks['overall_risk']} ({len(risks['risks'])} risks)")
    
    # 6. Status flow: draft → do_podpisu → aktywna
    for status in ["do_podpisu", "aktywna"]:
        r = requests.patch(f"{BASE}/contracts/{cid}/status?status={status}")
        assert r.status_code == 200
    print(f"  6. ✅ Status flow: draft → do_podpisu → aktywna")
    
    # 7. Create annex (rate change)
    r = requests.post(f"{BASE}/contracts/{cid}/annex", json={
        "type": "rate_change",
        "changes": [{"field": "stawka", "old": "175", "new": "195"}],
        "effective_date": "01.08.2026",
    })
    assert r.status_code == 200
    annex = r.json()
    print(f"  7. ✅ Annex created: {annex['message']}")
    
    # 8. Verify rate updated
    r = requests.get(f"{BASE}/contracts/{cid}")
    assert r.status_code == 200
    updated = r.json()
    assert updated["rate"] == 195.0, f"Rate not updated: {updated['rate']}"
    print(f"  8. ✅ Rate updated: 175 → 195 PLN/h")
    
    # 9. Get history
    r = requests.get(f"{BASE}/contracts/{cid}/history")
    assert r.status_code == 200
    history = r.json()
    assert len(history) >= 3  # created + status_changed + annex
    print(f"  9. ✅ Audit history: {len(history)} entries")
    
    # 10. Benchmark
    r = requests.get(f"{BASE}/benchmark/{cid}")
    assert r.status_code == 200
    bench = r.json()
    print(f" 10. ✅ Benchmark: {bench['position']} (vs median {bench['benchmark']['median']} PLN/h)")
    
    # 11. Email preview
    r = requests.get(f"{BASE}/contracts/{cid}/email-preview")
    assert r.status_code == 200
    email = r.json()
    assert "lifecycle@test.pl" in email["to"]
    print(f" 11. ✅ Email preview: to={email['to']}")
    
    # 12. Download
    r = requests.get(f"{BASE}/contracts/{cid}/download")
    assert r.status_code == 200
    assert len(r.content) > 1000
    print(f" 12. ✅ Download: {len(r.content)} bytes")
    
    print()
    print("✅ FULL LIFECYCLE TEST PASSED!")
    return cid


def test_search_and_analytics():
    """Test search and analytics endpoints."""
    print("\n=== Search & Analytics ===")
    
    # Stats
    r = requests.get(f"{BASE}/contracts/stats")
    assert r.status_code == 200
    print(f"  ✅ Stats: {r.json()['total']} contracts")
    
    # Quality
    r = requests.get(f"{BASE}/quality")
    assert r.status_code == 200
    print(f"  ✅ Quality score: {r.json()['quality_score']}/100")
    
    # Aging
    r = requests.get(f"{BASE}/analytics/aging")
    assert r.status_code == 200
    print(f"  ✅ Aging: {r.json()['total_active']} active")
    
    # Benchmark portfolio
    r = requests.get(f"{BASE}/benchmark")
    assert r.status_code == 200
    print(f"  ✅ Benchmark: avg {r.json()['avg_vs_median_pct']}% vs market")
    
    # Search
    r = requests.get(f"{BASE}/search?q=Lifecycle+Test")
    assert r.status_code == 200
    print(f"  ✅ Search: {r.json()['total_contracts']} results")
    
    # Report
    r = requests.get(f"{BASE}/report")
    assert r.status_code == 200
    assert "PARAGRAF" in r.json()["markdown"]
    print(f"  ✅ Daily report generated")
    
    # Rate recommendation
    r = requests.get(f"{BASE}/ai/recommend-rate?role=DevOps&area=DevOps&client=Nordea")
    assert r.status_code == 200
    rec = r.json()
    print(f"  ✅ Rate rec: {rec['recommended_rate']} PLN/h ({rec['leverage']})")
    
    print("\n✅ ALL ANALYTICS TESTS PASSED!")


if __name__ == "__main__":
    cid = test_full_lifecycle()
    test_search_and_analytics()
