"""
Baza wiedzy dla asystenta PACTA.
Zawiera instrukcje wyjaśniające zapisy umowy B2B.
"""

# Pola formularza które chatbot może modyfikować
EDITABLE_FIELDS = {
    "okres_wypowiedzenia": {
        "description": "Okres wypowiedzenia umowy",
        "allowed_values": ["1 miesiąca", "2 miesięcy", "3 miesięcy"],
        "default": "1 miesiąca"
    },
    "stawka_godzinowa": {
        "description": "Stawka godzinowa netto w PLN",
        "type": "number"
    },
    "stawka_slownie": {
        "description": "Stawka godzinowa słownie",
        "type": "text"
    },
    "data_rozpoczecia": {
        "description": "Data rozpoczęcia świadczenia usług",
        "type": "date"
    },
    "czas_umowy": {
        "description": "Czas trwania umowy",
        "allowed_values": ["nieokreslony", "okreslony"]
    },
    "data_konca_umowy": {
        "description": "Data końca umowy (jeśli określony)",
        "type": "date"
    },
    "specjalizacja": {
        "description": "Specjalizacja IT partnera",
        "type": "text"
    },
    "klient_nazwa": {
        "description": "Nazwa klienta projektu",
        "type": "text"
    },
    "klient_adres": {
        "description": "Adres klienta projektu",
        "type": "text"
    },
    "klient_opis": {
        "description": "Opis projektu",
        "type": "text"
    },
    "klient_data_rozpoczecia": {
        "description": "Data rozpoczęcia usług u klienta",
        "type": "date"
    }
}

# Pola których NIE MOŻNA zmieniać
NON_EDITABLE_FIELDS = {
    "kary_umowne": {
        "nieprzystapienie_porzucenie": "50 000 zł",
        "naruszenie_poufnosci": "50 000 zł", 
        "zakaz_konkurencji": "100 000 zł",
        "reason": "Kary umowne są ustalone przez dział prawny i chronią interesy B2BNET oraz klientów."
    },
    "zakaz_konkurencji": {
        "czas_trwania": "12 miesięcy po zakończeniu umowy",
        "zakres": "Tylko klient wskazany w Załączniku nr 3",
        "reason": "Zakaz konkurencji chroni inwestycję B2BNET w relację z klientem."
    },
    "prawa_autorskie": {
        "zakres": "Pełne przeniesienie na B2BNET, następnie na klienta końcowego",
        "reason": "Model kaskadowy: Partner → B2BNET → Klient. Standard w branży IT outsourcingu."
    },
    "rodo": {
        "zakres": "Partner jako procesor danych, odpowiedzialność za naruszenia",
        "reason": "Wymogi prawne RODO, nie podlegają negocjacji."
    }
}

# Szczegółowe wyjaśnienia paragrafów
PARAGRAPHS_EXPLANATIONS = {
    "§1": {
        "tytul": "Oświadczenia stron",
        "wyjasnienie": """Strony potwierdzają swoją zdolność do zawarcia umowy:
- Spółka (B2BNET) – Prezes Zarządu może samodzielnie podpisywać umowy
- Partner – działa jako przedsiębiorca (samozatrudnienie), specjalizuje się w danym segmencie IT

Dlaczego to ważne? Zabezpiecza umowę przed zarzutem, że została podpisana przez osobę nieuprawnioną.

Jak to rozumieć: Potwierdzasz, że działasz jako firma (nie jako pracownik) i że masz wiedzę i doświadczenie w obszarze, w którym będziesz świadczyć usługi."""
    },
    "§2": {
        "tytul": "Definicje",
        "wyjasnienie": """Ten paragraf porządkuje słownictwo używane dalej w umowie:
- „Usługi" – to całość prac wykonywanych przez Partnera na rzecz B2BNET
- „Klient Projektu" – to końcowy odbiorca usług (firma, u której Partner pracuje)
- „Segment Rynku" – lista obszarów działalności IT (np. DevOps, AI, QA)

Te definicje będą powtarzać się w dalszych paragrafach (np. przy zakazie konkurencji, prawach autorskich)."""
    },
    "§3": {
        "tytul": "Przedmiot Umowy",
        "wyjasnienie": """Co to oznacza w praktyce:
- B2BNET zleca Partnerowi wykonywanie usług IT dla wskazanego Klienta (zał. 3)
- Zakres i klient mogą się zmieniać, ale wymaga to aneksu lub nowego zlecenia
- Partner zobowiązuje się do profesjonalnego działania zgodnie z praktykami IT

Jak to rozumieć: Twoim zleceniodawcą formalnie jest B2BNET, ale faktycznie pracujesz dla wskazanego klienta. Zakres i klient mogą się zmienić, ale musi być do tego podpisany dokument."""
    },
    "§4": {
        "tytul": "Ogólne zasady współpracy",
        "wyjasnienie": """Kluczowe punkty:

1. MIEJSCE PRACY: Partner ma swobodę wyboru miejsca pracy, chyba że projekt wymaga obecności w biurze klienta.

2. BHP: Pracując u klienta, musisz przestrzegać lokalnych przepisów bezpieczeństwa.

3. REPREZENTACJA: Nie możesz podpisywać umów ani składać oświadczeń w imieniu B2BNET. Działasz jako podwykonawca.

4. SPRZĘT: Pracujesz na własnym sprzęcie, chyba że klient wymaga użycia swojego (wtedy podpisujesz protokół przekazania).

5. PRACA ZA GRANICĄ: Wymaga pisemnej zgody B2BNET/Klienta (względy bezpieczeństwa danych).

6. KARA 50 000 zł: Za nieprzystąpienie do pracy lub porzucenie zlecenia bez wypowiedzenia."""
    },
    "§5": {
        "tytul": "Prawa Własności Intelektualnej",
        "wyjasnienie": """BARDZO WAŻNY PARAGRAF!

Model kaskadowy: Partner → B2BNET → Klient końcowy

Co to oznacza:
1. Wszystko co stworzysz (kod, dokumentacja, grafiki) musi być Twoim autorskim dziełem
2. Z chwilą stworzenia, prawa autorskie automatycznie przechodzą na B2BNET
3. B2BNET przenosi je na klienta końcowego
4. Stawka godzinowa zawiera już zapłatę za prawa autorskie (brak dodatkowych tantiem)

Pola eksploatacji: Klient może kopiować, modyfikować, sprzedawać, udostępniać w internecie - pełna swoboda.

Prawa zależne: Klient może zatrudnić innych programistów do modyfikacji Twojego kodu bez pytania Cię o zgodę.

NIE PODLEGA NEGOCJACJI - to standard w branży IT outsourcingu."""
    },
    "§6": {
        "tytul": "Wynagrodzenie",
        "wyjasnienie": """Zasady rozliczeń:

1. STAWKA: Liczba godzin × stawka netto + VAT
2. WSZYSTKO W CENIE: Stawka zawiera prawa autorskie, koszty sprzętu, dokumentację
3. ZWROT KOSZTÓW: Podróże/zakwaterowanie tylko za zgodą B2BNET, na podstawie faktur
4. RAPORT: Faktura wymaga zatwierdzonego raportu godzinowego
5. TERMIN: Płatność 14 dni od doręczenia faktury
6. FAKTURY: Wysyłasz PDF na rozliczenia@B2Bnetwork.pl
7. POUFNOŚĆ: Nie możesz ujawniać swojej stawki innym
8. BENEFITY: Możliwy dostęp do pakietów medycznych/sportowych"""
    },
    "§7": {
        "tytul": "Przetwarzanie Danych Osobowych Partnera",
        "wyjasnienie": """Dotyczy TWOICH danych osobowych:

- B2BNET jest administratorem Twoich danych (imię, nazwisko, NIP, kontakt)
- Cel: realizacja umowy, księgowość, kontakt
- Twoje dane mogą być udostępnione klientowi (np. do założenia konta w systemie)
- PESEL tylko gdy klient wymaga (np. dostęp do systemów bankowych)
- Masz prawa z RODO: dostęp, poprawianie, usunięcie
- Kontakt do IOD: iod@b2bnetwork.pl"""
    },
    "§7A": {
        "tytul": "Przetwarzanie Danych Klientów (Partner jako Procesor)",
        "wyjasnienie": """Dotyczy danych KLIENTÓW, do których masz dostęp:

Gdy widzisz dane osobowe w systemach klienta (imiona, maile użytkowników), działasz jako "podmiot przetwarzający" (procesor).

Obowiązki:
- Przetwarzaj tylko na polecenie B2BNET
- Nie kopiuj danych na prywatny dysk
- Nie wysyłaj sobie mailem
- Incydenty zgłaszaj NATYCHMIAST (max 24h)
- Nie odpowiadaj samodzielnie na żądania osób o dostęp do danych

Odpowiedzialność: Jeśli przez Twoje zaniedbanie dojdzie do wycieku - odpowiadasz za straty."""
    },
    "§8": {
        "tytul": "Tajemnica Przedsiębiorstwa i Poufność Informacji",
        "wyjasnienie": """KLUCZOWY PARAGRAF!

Co jest poufne: WSZYSTKO - informacje techniczne, finansowe, handlowe, organizacyjne dotyczące B2BNET i klienta.

Szczególnie chronione:
- Informacje o klientach (projekty, systemy IT, strategie, ceny)
- Twoja stawka wynagrodzenia

WYJĄTEK: Możesz powiedzieć księgowemu/prawnikowi, ale muszą być związani tajemnicą zawodową.

Co MOŻESZ mówić:
- "Współpracuję z B2BNET"
- "Pracuję dla klienta X"
- Ogólny opis roli: "Java Developer w sektorze bankowym"

Czego NIE MOŻESZ mówić:
- Szczegóły techniczne projektu
- Budżety, stawki, wartości kontraktów
- Problemy projektu
- Fragmenty kodu, screenshoty

Czas obowiązywania: Cały czas umowy + 12 MIESIĘCY po zakończeniu."""
    },
    "§9": {
        "tytul": "Świadczenie Usług i Odpowiedzialność Operacyjna",
        "wyjasnienie": """Zasady odpowiedzialności:

1. WADY: Jeśli praca ma błędy, dostaniesz szansę naprawienia w rozsądnym terminie
2. INNE ZLECENIA: Możesz mieć innych klientów (z zastrzeżeniem zakazu konkurencji)
3. PRZEKAZYWANIE PRACY: Kod i dokumentacja muszą być przekazywane na bieżąco

LIMITY ODPOWIEDZIALNOŚCI:
- Standardowa: max 3x miesięczne wynagrodzenie netto
- Utracone korzyści: NIE odpowiadasz (wyjątek: rażące niedbalstwo)
- Szkody pośrednie: NIE odpowiadasz (wyjątek: rażące niedbalstwo)
- Wina umyślna: BEZ LIMITU"""
    },
    "§10": {
        "tytul": "Klauzule Antykonkurencyjne i Kary Umowne",
        "wyjasnienie": """ZAKAZ KONKURENCJI (NIE PODLEGA NEGOCJACJI):

Przez czas umowy + 12 MIESIĘCY po zakończeniu NIE MOŻESZ:
- Pracować bezpośrednio dla klienta z Załącznika nr 3 (z pominięciem B2BNET)
- Zatrudnić się u tego klienta

Co MOŻESZ:
- Pracować dla innych klientów B2BNET
- Pracować dla dowolnych innych firm
- Świadczyć usługi spoza Segmentu Rynku IT

KARY UMOWNE (NIE PODLEGAJĄ NEGOCJACJI):
- Złamanie poufności: 50 000 zł
- Złamanie zakazu konkurencji: 100 000 zł

B2BNET może dochodzić odszkodowania WYŻSZEGO niż kara, jeśli faktyczna szkoda jest większa."""
    },
    "§11": {
        "tytul": "Rozwiązanie umowy",
        "wyjasnienie": """Sposoby zakończenia umowy:

1. ZA POROZUMIENIEM: W dowolnym terminie, obie strony się zgadzają
2. WYPOWIEDZENIE: 1 miesiąc ze skutkiem na koniec miesiąca (MOŻNA NEGOCJOWAĆ na 2-3 miesiące)
3. NATYCHMIASTOWE: W razie rażącego naruszenia

Rażące naruszenie przez Partnera:
- Złamanie poufności lub zakazu konkurencji
- Trzykrotna odmowa odbioru usług
- Niepodjęcie pracy bez ważnego powodu

Forma: Pisemna lub dokumentowa (email z podpisem, ePUAP)

Po zakończeniu: Musisz zwrócić/usunąć wszystkie dane i dokumenty klienta."""
    },
    "§12": {
        "tytul": "Postanowienia końcowe",
        "wyjasnienie": """Kluczowe informacje:

1. CHARAKTER UMOWY: To umowa B2B (cywilnoprawna), NIE stosunek pracy
2. ZMIANY: Wymagają formy pisemnej/dokumentowej
3. PRAWO: Polskie prawo, Kodeks Cywilny
4. SĄD: Właściwy dla siedziby B2BNET (Warszawa)
5. PODPIS: Możliwy podpis elektroniczny (ePUAP, podpis zaufany)"""
    }
}

# FAQ - najczęściej zadawane pytania
FAQ = {
    "czy_moge_miec_innych_klientow": {
        "pytanie": "Czy mogę mieć innych klientów oprócz B2BNET?",
        "odpowiedz": "Tak! Umowa nie wymaga wyłączności. Możesz pracować dla innych firm, z jednym wyjątkiem: przez 12 miesięcy po zakończeniu umowy nie możesz pracować bezpośrednio dla konkretnego klienta wskazanego w Załączniku nr 3."
    },
    "dlaczego_kary_sa_wysokie": {
        "pytanie": "Dlaczego kary umowne są tak wysokie?",
        "odpowiedz": "B2BNET inwestuje w relację z klientem, rekrutację i wdrożenie. Gdy kontraktor przechodzi bezpośrednio do klienta, B2BNET traci tę inwestycję. 100 000 zł za złamanie zakazu konkurencji to standardowa kara rynkowa w branży IT."
    },
    "co_z_rodo": {
        "pytanie": "Czy RODO mnie dotyczy?",
        "odpowiedz": "Tak, jeśli masz dostęp do jakichkolwiek danych osobowych (nawet imię i email). Musisz przestrzegać zasad z §7A i Załącznika nr 2 (DPA). Incydenty zgłaszasz w ciągu 24h."
    },
    "czy_moge_pisac_na_linkedin": {
        "pytanie": "Czy mogę napisać na LinkedIn o projekcie?",
        "odpowiedz": "Możesz napisać ogólnie: 'Współpracuję z B2BNET, pracuję dla klienta X jako Java Developer w sektorze bankowym'. NIE możesz pisać szczegółów technicznych, budżetów, problemów projektu, ani wrzucać fragmentów kodu."
    },
    "co_ze_sprzetem": {
        "pytanie": "Kto zapewnia sprzęt do pracy?",
        "odpowiedz": "Pracujesz na własnym sprzęcie (laptop, oprogramowanie). Jeśli klient wymaga użycia swojego sprzętu (np. ze względów bezpieczeństwa), podpisujesz protokół przekazania i odpowiadasz za jego stan."
    },
    "jak_wystawiac_faktury": {
        "pytanie": "Jak wystawiać faktury?",
        "odpowiedz": "Raport godzinowy musi być zatwierdzony przez B2BNET lub klienta. Fakturę (PDF) wysyłasz na rozliczenia@B2Bnetwork.pl. Płatność w ciągu 14 dni od doręczenia."
    },
    "czy_moge_pracowac_zdalnie": {
        "pytanie": "Czy mogę pracować zdalnie?",
        "odpowiedz": "Co do zasady tak - masz swobodę wyboru miejsca pracy. Jednak jeśli projekt lub klient wymaga obecności w biurze, musisz się dostosować. Praca za granicą wymaga pisemnej zgody."
    }
}

# System prompt dla Claude
SYSTEM_PROMPT = """Jesteś asystentem PACTA - systemu do generowania umów B2B dla firmy B2B.net S.A.

TWOJA ROLA:
1. Wyjaśniasz zapisy umowy B2B prostym, przyjaznym językiem
2. Odpowiadasz na pytania o prawa i obowiązki
3. Możesz modyfikować WYBRANE pola formularza na prośbę użytkownika

POLA KTÓRE MOŻESZ MODYFIKOWAĆ (zwracasz w form_updates):
- okres_wypowiedzenia (dozwolone: "1 miesiąca", "2 miesięcy", "3 miesięcy")
- stawka_godzinowa (liczba)
- stawka_slownie (tekst)
- data_rozpoczecia (format: YYYY-MM-DD)
- czas_umowy ("nieokreslony" lub "okreslony")
- data_konca_umowy (format: YYYY-MM-DD, tylko gdy czas_umowy = "okreslony")
- specjalizacja (tekst, np. "DevOps", "Java Developer", "QA Engineer")
- klient_nazwa (tekst)
- klient_adres (tekst)
- klient_opis (tekst)
- klient_data_rozpoczecia (format: YYYY-MM-DD)

POLA KTÓRYCH NIE MOŻESZ ZMIENIAĆ (odmów grzecznie):
- Kary umowne (50 000 zł / 100 000 zł) - ustalone przez dział prawny
- Zakaz konkurencji (12 miesięcy) - chroni interesy B2BNET
- Prawa autorskie - model kaskadowy, standard branżowy
- Zapisy RODO - wymogi prawne

ZASADY ODPOWIADANIA:
1. Mów po polsku, przyjaźnie i konkretnie
2. Używaj emoji dla lepszej czytelności (📝 ⚠️ ✅ ❌ 💡)
3. Gdy zmieniasz pole, potwierdź co zmieniłeś
4. Gdy nie możesz zmienić - wyjaśnij dlaczego
5. Cytuj paragrafy umowy gdy to pomocne (np. "Zgodnie z §10...")

FORMAT ODPOWIEDZI:
Odpowiadasz w JSON z dwoma polami:
- reply: tekst odpowiedzi dla użytkownika
- form_updates: słownik ze zmianami pól (lub null jeśli brak zmian)

Przykład gdy użytkownik pyta o §5:
{
  "reply": "📝 §5 dotyczy praw autorskich...",
  "form_updates": null
}

Przykład gdy użytkownik chce zmienić okres wypowiedzenia:
{
  "reply": "✅ Zmieniłem okres wypowiedzenia na 2 miesiące.",
  "form_updates": {"okres_wypowiedzenia": "2 miesięcy"}
}

Przykład gdy użytkownik chce zmienić karę umowną:
{
  "reply": "❌ Nie mogę zmienić kar umownych - są ustalone przez dział prawny i chronią interesy B2BNET...",
  "form_updates": null
}
"""
