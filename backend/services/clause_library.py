"""
Clause library — reusable contract clauses for B2B.net
Standard paragraphs that Marta can insert into contracts
"""

CLAUSES = {
    "non_compete_standard": {
        "name": "Zakaz konkurencji — standard (12 mies)",
        "category": "Non-compete",
        "text": (
            "Partner zobowiazuje sie, iz w okresie obowiazywania Umowy oraz przez okres 12 miesiecy "
            "od dnia jej rozwiazania lub wygasniecia, nie bedzie swiadczyl uslug na rzecz podmiotow "
            "prowadzacych dzialalnosc konkurencyjna wobec Klienta, w zakresie stanowiacym przedmiot "
            "niniejszej Umowy. Naruszenie niniejszego postanowienia stanowi podstawe do naliczenia "
            "kary umownej w wysokosci 100.000 PLN."
        ),
        "risk_level": "medium",
        "notes": "Standard B2B.net. Kara 100k — w normie rynkowej (SN: 6-24 mies).",
    },
    "non_compete_light": {
        "name": "Zakaz konkurencji — lekki (6 mies)",
        "category": "Non-compete",
        "text": (
            "Partner zobowiazuje sie, iz w okresie obowiazywania Umowy oraz przez okres 6 miesiecy "
            "od dnia jej rozwiazania, nie bedzie swiadczyl uslug bezposrednio na rzecz Klienta "
            "wskazanego w niniejszej Umowie, bez zgody Zamawiajacego."
        ),
        "risk_level": "low",
        "notes": "Lżejsza wersja — tylko u tego samego klienta, 6 mies.",
    },
    "nda_standard": {
        "name": "Poufność — standard (24 mies)",
        "category": "NDA",
        "text": (
            "Partner zobowiazuje sie do zachowania w scislej tajemnicy wszelkich informacji "
            "uzyskanych w zwiazku z realizacja Umowy, stanowiacych tajemnice przedsiebiorstwa "
            "Zamawiajacego lub Klienta, przez okres 24 miesiecy od zakonczenia Umowy. "
            "Naruszenie obowiazku poufnosci stanowi podstawe do naliczenia kary umownej "
            "w wysokosci 50.000 PLN."
        ),
        "risk_level": "medium",
        "notes": "Standard. 24 mies poufności, kara 50k.",
    },
    "ip_transfer": {
        "name": "Przeniesienie praw autorskich",
        "category": "IP",
        "text": (
            "Z chwila wyplacenia wynagrodzenia za dany okres rozliczeniowy, Partner przenosi "
            "na Zamawiajacego calość majatkowych praw autorskich do utworow powstalych "
            "w zwiazku ze swiadczeniem Uslug, na wszystkich znanych w chwili przeniesienia "
            "polach eksploatacji."
        ),
        "risk_level": "high",
        "notes": "Pelne przeniesienie IP. Kontraktor traci wszelkie prawa do kodu.",
    },
    "ip_license": {
        "name": "Licencja na korzystanie z utworów",
        "category": "IP",
        "text": (
            "Partner udziela Zamawiajacemu niewyłacznej, nieograniczonej terytorialnie licencji "
            "na korzystanie z utworow powstalych w zwiazku ze swiadczeniem Uslug, na potrzeby "
            "realizacji projektu Klienta. Licencja obejmuje prawo do modyfikacji, kopiowania "
            "i rozpowszechniania w ramach organizacji Zamawiajacego i Klienta."
        ),
        "risk_level": "low",
        "notes": "Bezpieczniejsza alternatywa — licencja zamiast pełnego przeniesienia.",
    },
    "force_majeure": {
        "name": "Siła wyższa (Force Majeure)",
        "category": "General",
        "text": (
            "Zadna ze Stron nie ponosi odpowiedzialnosci za niewykonanie lub nienalezyte "
            "wykonanie zobowiazan wynikajacych z Umowy, jezeli jest to spowodowane zdarzeniami "
            "o charakterze sily wyzszej, tj. zdarzeniami nadzwyczajnymi, nieprzewidywalnymi "
            "i niezaleznymi od woli Stron. Strona dotknięta sila wyzsza zobowiazana jest "
            "poinformowac druga Strone w terminie 48 godzin od jej wystapienia."
        ),
        "risk_level": "low",
        "notes": "Standardowa klauzula force majeure. Brak w aktualnym drafcie B2B.net!",
    },
    "termination_notice": {
        "name": "Wypowiedzenie z 30-dniowym terminem",
        "category": "Termination",
        "text": (
            "Kazda ze Stron moze wypowiedziec Umowe z zachowaniem 30-dniowego okresu "
            "wypowiedzenia, ze skutkiem na koniec miesiaca kalendarzowego, bez podania przyczyny. "
            "Wypowiedzenie wymaga formy pisemnej pod rygorem niewaznosci."
        ),
        "risk_level": "low",
        "notes": "Standardowe 30 dni. Rynek: 14-60 dni.",
    },
    "liability_cap": {
        "name": "Ograniczenie odpowiedzialności (3x miesięczne)",
        "category": "Liability",
        "text": (
            "Calkowita odpowiedzialnosc Partnera z tytulu niniejszej Umowy nie przekroczy "
            "kwoty równej 3-krotnosci miesiecznego wynagrodzenia, z wylaczeniem odpowiedzialnosci "
            "za: (a) umyslne naruszenie postanowien Umowy, (b) naruszenie przepisow RODO, "
            "(c) naruszenie praw wlasnosci intelektualnej."
        ),
        "risk_level": "low",
        "notes": "Art. 473 §1 KC — dopuszczalne. Wyłączenia z limitu: RODO, IP, umyślne.",
    },
}


def list_clauses(category: str = None) -> list:
    """List available clauses, optionally filtered by category."""
    result = []
    for key, clause in CLAUSES.items():
        if category and clause["category"].lower() != category.lower():
            continue
        result.append({
            "id": key,
            **clause,
        })
    return result


def get_clause(clause_id: str) -> dict:
    """Get a specific clause by ID."""
    return CLAUSES.get(clause_id, {"error": "Clause not found"})
