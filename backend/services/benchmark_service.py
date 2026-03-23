"""
Benchmark service — compare B2B.net rates with market data
Based on industry benchmarks for Polish IT B2B market 2024-2026
"""

# Market rate benchmarks (PLN/h netto) — Poland, B2B IT
# Sources: No Fluff Jobs, Just Join IT, Bulldogjob reports 2024-2025
MARKET_RATES = {
    "Software Development": {
        "junior": {"min": 60, "median": 90, "max": 130},
        "mid": {"min": 100, "median": 140, "max": 190},
        "senior": {"min": 140, "median": 180, "max": 250},
        "lead": {"min": 170, "median": 220, "max": 300},
    },
    "QA": {
        "junior": {"min": 50, "median": 75, "max": 110},
        "mid": {"min": 80, "median": 110, "max": 150},
        "senior": {"min": 110, "median": 145, "max": 200},
        "lead": {"min": 140, "median": 180, "max": 240},
    },
    "Test Automation": {
        "junior": {"min": 60, "median": 85, "max": 120},
        "mid": {"min": 90, "median": 130, "max": 170},
        "senior": {"min": 130, "median": 165, "max": 220},
        "lead": {"min": 160, "median": 200, "max": 260},
    },
    "DevOps": {
        "junior": {"min": 70, "median": 100, "max": 140},
        "mid": {"min": 110, "median": 150, "max": 200},
        "senior": {"min": 150, "median": 195, "max": 270},
        "lead": {"min": 180, "median": 240, "max": 320},
    },
    "Cloud Solutions": {
        "junior": {"min": 70, "median": 100, "max": 140},
        "mid": {"min": 110, "median": 155, "max": 210},
        "senior": {"min": 155, "median": 200, "max": 280},
        "lead": {"min": 190, "median": 250, "max": 340},
    },
    "Data & Analytics": {
        "junior": {"min": 60, "median": 90, "max": 130},
        "mid": {"min": 100, "median": 140, "max": 185},
        "senior": {"min": 140, "median": 185, "max": 250},
        "lead": {"min": 170, "median": 230, "max": 310},
    },
    "Cybersecurity": {
        "junior": {"min": 70, "median": 105, "max": 145},
        "mid": {"min": 115, "median": 160, "max": 210},
        "senior": {"min": 160, "median": 210, "max": 290},
        "lead": {"min": 200, "median": 260, "max": 350},
    },
    "Project Management": {
        "junior": {"min": 60, "median": 85, "max": 120},
        "mid": {"min": 90, "median": 130, "max": 175},
        "senior": {"min": 130, "median": 170, "max": 230},
        "lead": {"min": 160, "median": 210, "max": 280},
    },
    "IT Support": {
        "junior": {"min": 40, "median": 60, "max": 85},
        "mid": {"min": 65, "median": 90, "max": 120},
        "senior": {"min": 90, "median": 120, "max": 160},
        "lead": {"min": 110, "median": 145, "max": 190},
    },
}


def _detect_seniority(role: str) -> str:
    """Detect seniority level from role title."""
    role_lower = role.lower()
    if any(w in role_lower for w in ["lead", "principal", "head", "kierownik", "manager", "architekt"]):
        return "lead"
    if any(w in role_lower for w in ["senior", "sr.", "starszy", "expert"]):
        return "senior"
    if any(w in role_lower for w in ["junior", "jr.", "młodszy", "intern", "stażysta"]):
        return "junior"
    return "mid"


def benchmark_rate(rate: float, it_area: str, role: str = "") -> dict:
    """Compare a rate against market benchmarks."""
    seniority = _detect_seniority(role)
    
    area_data = MARKET_RATES.get(it_area, MARKET_RATES.get("Software Development"))
    level_data = area_data.get(seniority, area_data["mid"])
    
    median = level_data["median"]
    
    if rate <= 0:
        return {
            "rate": rate,
            "it_area": it_area,
            "seniority": seniority,
            "benchmark": level_data,
            "position": "unknown",
            "vs_median": 0,
            "vs_median_pct": 0,
            "recommendation": "Brak stawki — nie można porównać",
        }
    
    diff = rate - median
    diff_pct = round((diff / median) * 100, 1)
    
    if rate < level_data["min"]:
        position = "below_market"
        recommendation = f"Stawka {rate} PLN/h jest PONIŻEJ minimum rynkowego ({level_data['min']} PLN/h) dla {seniority} {it_area}. Ryzyko rotacji."
    elif rate < median * 0.9:
        position = "below_median"
        recommendation = f"Stawka poniżej mediany rynkowej ({median} PLN/h). Konkurencyjność ograniczona."
    elif rate <= median * 1.1:
        position = "at_market"
        recommendation = f"Stawka w zakresie rynkowym (mediana {median} PLN/h). OK."
    elif rate <= level_data["max"]:
        position = "above_median"
        recommendation = f"Stawka powyżej mediany ({median} PLN/h), ale w zakresie. Dobra retencja."
    else:
        position = "above_market"
        recommendation = f"Stawka POWYŻEJ maximum rynkowego ({level_data['max']} PLN/h). Premium lub renegocjacja."
    
    return {
        "rate": rate,
        "it_area": it_area,
        "seniority": seniority,
        "benchmark": level_data,
        "position": position,
        "vs_median": round(diff, 2),
        "vs_median_pct": diff_pct,
        "recommendation": recommendation,
    }


def benchmark_portfolio(contracts: list) -> dict:
    """Benchmark all contracts with rates against market."""
    results = {
        "total_with_rate": 0,
        "below_market": 0,
        "at_market": 0,
        "above_market": 0,
        "avg_vs_median_pct": 0,
        "areas": {},
    }
    
    diffs = []
    
    for c in contracts:
        if c.rate <= 0:
            continue
        results["total_with_rate"] += 1
        
        b = benchmark_rate(c.rate, c.it_area, c.role)
        
        if b["position"] in ("below_market", "below_median"):
            results["below_market"] += 1
        elif b["position"] == "at_market":
            results["at_market"] += 1
        else:
            results["above_market"] += 1
        
        diffs.append(b["vs_median_pct"])
        
        area = c.it_area
        if area not in results["areas"]:
            results["areas"][area] = {"count": 0, "avg_rate": 0, "rates": [], "median": 0}
        results["areas"][area]["count"] += 1
        results["areas"][area]["rates"].append(c.rate)
    
    if diffs:
        results["avg_vs_median_pct"] = round(sum(diffs) / len(diffs), 1)
    
    for area in results["areas"]:
        rates = results["areas"][area]["rates"]
        results["areas"][area]["avg_rate"] = round(sum(rates) / len(rates), 2)
        seniority_data = MARKET_RATES.get(area, {}).get("mid", {})
        results["areas"][area]["median"] = seniority_data.get("median", 0)
        del results["areas"][area]["rates"]
    
    return results
