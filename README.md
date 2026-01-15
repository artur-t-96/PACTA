# 🏛️ PACTA - Partner And Contract Transaction Assistant

Generator umów B2B z asystentem AI dla B2B.net S.A.

## ✨ Funkcjonalności

- 📝 **Generator umów** - automatyczne wypełnianie szablonów DOCX
- 🔍 **Integracja CEIDG** - auto-uzupełnianie danych firmy po NIP
- 💬 **Asystent AI** - wyjaśnianie zapisów umowy + modyfikacja parametrów
- 📄 **Eksport DOCX** - kompletna umowa z załącznikami w jednym pliku

## 🚀 Szybki start

### Wymagania
- Python 3.11+
- Klucz API Anthropic (opcjonalnie, dla chatbota AI)
- Klucz API CEIDG (opcjonalnie, dla pobierania danych firm)

### Instalacja lokalna

```bash
# Klonowanie repozytorium
git clone <repo-url>
cd pacta

# Instalacja zależności
pip install -r requirements.txt

# Konfiguracja
cp .env.example .env
# Edytuj .env i uzupełnij klucze API

# Uruchomienie
python main.py
```

Aplikacja będzie dostępna pod adresem: http://localhost:8000

### Deploy na Render.com

1. Utwórz nowy Web Service na Render
2. Połącz z repozytorium GitHub
3. Render automatycznie wykryje `Dockerfile`
4. Ustaw zmienne środowiskowe w dashboardzie Render:
   - `PASSWORD` - hasło do logowania
   - `ANTHROPIC_API_KEY` - klucz API Claude
   - `CEIDG_API_KEY` - klucz API CEIDG (opcjonalnie)

## 📁 Struktura projektu

```
pacta/
├── main.py                 # Punkt wejścia FastAPI
├── config.py               # Konfiguracja
├── requirements.txt        # Zależności
├── Dockerfile              # Do deploy
│
├── routers/                # Endpointy API
│   ├── auth.py             # Logowanie
│   ├── ceidg.py            # Pobieranie danych z CEIDG
│   ├── chat.py             # ChatBot AI
│   └── contract.py         # Generowanie umowy
│
├── services/               # Logika biznesowa
│   ├── ceidg_client.py     # Klient CEIDG API
│   ├── chat_assistant.py   # Asystent AI
│   └── document_generator.py # Generator DOCX
│
├── templates/              # Szablony HTML (Jinja2)
│   ├── base.html
│   ├── login.html
│   └── generator.html
│
├── static/                 # CSS, JS
│   ├── style.css
│   └── app.js
│
└── data/
    └── knowledge_base.py   # Baza wiedzy dla chatbota
```

## 🔐 Domyślne dane logowania

- **Login:** `rekruter`
- **Hasło:** `B2Bnet2026!`

⚠️ Zmień hasło w pliku `.env` przed wdrożeniem produkcyjnym!

## 📡 API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/login` | Strona logowania |
| POST | `/login` | Weryfikacja hasła |
| GET | `/logout` | Wylogowanie |
| GET | `/generator` | Główna strona aplikacji |
| GET | `/api/ceidg/{nip}` | Pobierz dane firmy z CEIDG |
| POST | `/api/chat` | Wyślij pytanie do chatbota |
| POST | `/api/generate` | Wygeneruj umowę DOCX |

## 💬 ChatBot - możliwości

### Pola które chatbot może modyfikować:
- Okres wypowiedzenia (1/2/3 miesiące)
- Stawka godzinowa
- Data rozpoczęcia
- Czas trwania umowy
- Specjalizacja
- Dane klienta projektu

### Pola nieedytowalne:
- Kary umowne (50 000 zł / 100 000 zł)
- Zakaz konkurencji (12 miesięcy)
- Prawa autorskie
- Zapisy RODO

## 🔧 Konfiguracja CEIDG API

1. Zarejestruj się na https://dane.biznes.gov.pl
2. Uzyskaj klucz API
3. Ustaw `CEIDG_API_KEY` w zmiennych środowiskowych

Bez klucza API system używa danych demo dla testów.

## 📝 Licencja

Własnościowe - B2B.net S.A.
