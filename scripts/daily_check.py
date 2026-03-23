#!/usr/bin/env python3
"""
PARAGRAF Daily Check Script
Run via cron: 0 9 * * 1-5 python3 ~/clawd/projects/paragraf/scripts/daily_check.py

Checks:
1. Contracts awaiting signature > 48h
2. Upcoming contract starts (next 7 days)
3. Contracts needing renewal (12+ months)
4. Data quality issues
5. Sends summary to JARVIS/Telegram
"""
import sys
import json
import requests
from datetime import datetime

BASE = "http://localhost:8001/api"


def check():
    results = []
    
    try:
        # 1. Digest
        r = requests.get(f"{BASE}/digest", timeout=5)
        digest = r.json()
        
        if digest["summary"]["unsigned_overdue"] > 0:
            results.append(f"⚠️ {digest['summary']['unsigned_overdue']} umów czeka na podpis >48h")
        
        if digest["summary"]["upcoming_starts"] > 0:
            results.append(f"📅 {digest['summary']['upcoming_starts']} umów startuje w ciągu 7 dni")
        
        # 2. Quality
        r = requests.get(f"{BASE}/quality", timeout=5)
        quality = r.json()
        if quality["quality_score"] < 100:
            results.append(f"🔧 Quality score: {quality['quality_score']}/100")
        
        # 3. Renewals
        r = requests.get(f"{BASE}/renewals", timeout=5)
        renewals = r.json()
        if len(renewals) > 0:
            results.append(f"🔄 {len(renewals)} umów wymaga przeglądu (12+ mies)")
        
        # 4. Live stats
        r = requests.get(f"{BASE}/live", timeout=5)
        live = r.json()
        
        header = f"📋 PARAGRAF Daily — {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        header += f"\n{live['active']} aktywnych | {live['total']} łącznie | avg {live['avg_rate']} PLN/h"
        
        if results:
            summary = header + "\n\n" + "\n".join(results)
        else:
            summary = header + "\n\n✅ Brak pilnych spraw"
        
        print(summary)
        return summary
        
    except Exception as e:
        msg = f"❌ PARAGRAF daily check failed: {e}"
        print(msg)
        return msg


if __name__ == "__main__":
    check()
