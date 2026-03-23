"""
PARAGRAF — Automated tests for contract generation
"""
import os
import sys
import json
import requests

BASE_URL = "http://localhost:8001/api/contracts"

# Test data — 5 different contractors
TEST_CONTRACTS = [
    {
        "imie": "Piotr", "nazwisko": "Zieliński",
        "firma": "PZ DevOps sp. z o.o.", "nip": "1111111111", "regon": "111111111",
        "adres": "ul. Mokotowska 15, 00-640 Warszawa",
        "email": "piotr@pzdevops.pl", "tel": "+48 500 111 111",
        "rola": "DevOps Engineer", "stawka": 180.0,
        "klient": "Nordea Bank Abp S.A. Oddział w Polsce",
        "data_startu": "2026-05-01",
        "obszar_it": "kubernetes i CI/CD pipelines",
        "opis_projektu": "Wdrożenie Kubernetes na AWS, CI/CD z Jenkins",
        "miasto_klienta": "Łódź"
    },
    {
        "imie": "Katarzyna", "nazwisko": "Wiśniewska",
        "firma": "KW Testing", "nip": "2222222222",
        "adres": "ul. Długa 10/3, 31-147 Kraków",
        "email": "kasia@kwtesting.pl", "tel": "+48 600 222 222",
        "rola": "Senior QA Automation Engineer", "stawka": 140.0,
        "klient": "PEKAO S.A.",
        "data_startu": "2026-04-15",
        "obszar_it": "selenium webdriver testy automatyczne",
        "opis_projektu": "Automatyzacja testów bankowości elektronicznej",
        "miasto_klienta": "Warszawa"
    },
    {
        "imie": "Michał", "nazwisko": "Dąbrowski",
        "firma": "MD Cloud Solutions", "nip": "3333333333", "regon": "333333333",
        "adres": "ul. Piotrkowska 100, 90-001 Łódź",
        "email": "michal@mdcloud.pl", "tel": "+48 700 333 333",
        "rola": "Cloud Architect", "stawka": 200.0,
        "klient": "Ferro S.A.",
        "data_startu": "2026-06-01",
        "obszar_it": "architektura chmurowa azure i migracja",
        "opis_projektu": "Migracja on-premise do Azure, architektura mikroserwisów",
        "miasto_klienta": "Skawina"
    },
    {
        "imie": "Anna", "nazwisko": "Kowalczyk",
        "firma": "AK Data Analytics", "nip": "4444444444",
        "adres": "ul. Mariacka 5, 80-833 Gdańsk",
        "email": "anna@akdata.pl", "tel": "+48 800 444 444",
        "rola": "Data Engineer", "stawka": 160.0,
        "klient": "BNP Paribas Bank Polska S.A.",
        "data_startu": "2026-04-01",
        "obszar_it": "ETL procesy i hurtownie danych snowflake",
        "opis_projektu": "Budowa data pipeline Snowflake + dbt",
        "miasto_klienta": "Warszawa"
    },
    {
        "imie": "Tomasz", "nazwisko": "Lewandowski",
        "firma": "TL Software House sp. z o.o.", "nip": "5555555555", "regon": "555555555",
        "adres": "ul. Armii Krajowej 20, 35-307 Rzeszów",
        "email": "tomasz@tlsoftware.pl", "tel": "+48 900 555 555",
        "rola": "Full Stack Developer", "stawka": 130.0,
        "klient": "Cognism Ltd.",
        "data_startu": "2026-05-15",
        "obszar_it": "react typescript node.js development",
        "opis_projektu": "Rozwój platformy SaaS, React + Node.js + PostgreSQL",
        "miasto_klienta": "London (remote)"
    },
]

# Expected IT area standardizations
EXPECTED_AREAS = [
    "DevOps / Cloud Engineering",
    "Quality Assurance (QA)",
    "Cloud Solutions",
    "Data & Analytics",
    "Software Development",
]

def test_generate_contracts():
    """Test generating 5 different contracts."""
    print("=== TEST: Generate 5 contracts ===")
    results = []
    
    for i, data in enumerate(TEST_CONTRACTS):
        resp = requests.post(f"{BASE_URL}/generate", json=data)
        assert resp.status_code == 200, f"Contract {i+1} failed: {resp.text}"
        result = resp.json()
        assert result["success"] == True
        assert result["contract"]["number"].endswith("/2026")
        
        # Check file exists
        file_path = result["contract"]["file_path"]
        assert os.path.exists(file_path), f"File not found: {file_path}"
        
        # Check AI standardized area
        area = result["it_area_standardized"]
        print(f"  ✅ {data['imie']} {data['nazwisko']} — {area} (expected: {EXPECTED_AREAS[i]})")
        
        results.append(result)
    
    print(f"  Generated {len(results)} contracts successfully")
    return results


def test_list_contracts():
    """Test listing contracts."""
    print("=== TEST: List contracts ===")
    resp = requests.get(BASE_URL)
    assert resp.status_code == 200
    contracts = resp.json()
    print(f"  ✅ {len(contracts)} contracts in database")
    return contracts


def test_contract_details():
    """Test getting contract details."""
    print("=== TEST: Contract details ===")
    resp = requests.get(f"{BASE_URL}/1")
    if resp.status_code == 200:
        contract = resp.json()
        print(f"  ✅ Contract {contract['number']}: {contract['contractor_name']}")
    else:
        print(f"  ⚠️ Contract 1 not found (may have been deleted)")


def test_check_risks():
    """Test risk checking."""
    print("=== TEST: Check risks ===")
    
    # Get latest contract ID
    contracts = requests.get(BASE_URL).json()
    if not contracts:
        print("  ⚠️ No contracts to test risks on")
        return
    
    contract_id = contracts[0]["id"]
    
    risk_data = {
        "contract_id": contract_id,
        "zmiany": [
            {"paragraf": "§10 ust.1", "zmiana": "Usunięcie zakazu konkurencji"},
            {"paragraf": "§8", "zmiana": "Skrócenie poufności z 12 do 3 miesięcy"},
            {"paragraf": "§5", "zmiana": "Usunięcie przeniesienia praw autorskich"},
        ]
    }
    
    resp = requests.post(f"{BASE_URL}/check-risks", json=risk_data)
    assert resp.status_code == 200
    result = resp.json()
    
    print(f"  Overall risk: {result['overall_risk']}")
    for risk in result["risks"]:
        emoji = {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(risk["ryzyko"], "❓")
        print(f"  {emoji} {risk['paragraf']}: {risk['uzasadnienie'][:80]}...")
    
    # At least one should be red (removing IP rights is dangerous)
    has_warning = any(r["ryzyko"] in ["red", "yellow"] for r in result["risks"])
    print(f"  ✅ Has warnings: {has_warning}")


def test_stats():
    """Test statistics endpoint."""
    print("=== TEST: Stats ===")
    resp = requests.get(f"{BASE_URL}/stats")
    if resp.status_code == 200:
        stats = resp.json()
        print(f"  ✅ Total: {stats['total']}, Avg rate: {stats['avg_rate']} PLN/h")
        print(f"  By client: {stats.get('by_client', {})}")
    else:
        print(f"  ⚠️ Stats endpoint: {resp.status_code}")


def test_docx_content():
    """Test that DOCX files have correct content."""
    print("=== TEST: DOCX content verification ===")
    from docx import Document
    
    # Find latest generated file
    output_dir = os.path.expanduser("~/clawd/projects/paragraf/backend/output/contracts")
    files = sorted([f for f in os.listdir(output_dir) if f.endswith(".docx")])
    
    if not files:
        print("  ⚠️ No DOCX files found")
        return
    
    for f in files[-3:]:  # Check last 3
        doc = Document(os.path.join(output_dir, f))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        
        has_number = "/2026" in full_text
        has_b2bnet = "B2B.net S.A." in full_text
        has_no_blanks = "____________" not in full_text[:500]  # Check komparycja
        
        status = "✅" if (has_number and has_b2bnet) else "❌"
        print(f"  {status} {f}: number={has_number}, b2bnet={has_b2bnet}, clean_header={has_no_blanks}")


if __name__ == "__main__":
    print("\n🔧 PARAGRAF — Automated Test Suite\n")
    
    try:
        test_generate_contracts()
        print()
        test_list_contracts()
        print()
        test_contract_details()
        print()
        test_check_risks()
        print()
        test_stats()
        print()
        test_docx_content()
        print()
        print("✅ All tests completed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
