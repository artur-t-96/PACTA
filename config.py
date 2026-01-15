import os
from dotenv import load_dotenv

load_dotenv()

# Auth
LOGIN = os.getenv("LOGIN", "rekruter")
PASSWORD = os.getenv("PASSWORD", "B2Bnet2026!")
SECRET_KEY = os.getenv("SECRET_KEY", "pacta-secret-key-change-in-production-2026")

# APIs
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CEIDG_API_KEY = os.getenv("CEIDG_API_KEY", "")
CEIDG_API_URL = os.getenv("CEIDG_API_URL", "https://dane.biznes.gov.pl/api/ceidg/v2")

# App
APP_NAME = "PACTA"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "Partner And Contract Transaction Assistant"

# Session
SESSION_COOKIE_NAME = "pacta_session"
SESSION_MAX_AGE = 60 * 60 * 8  # 8 godzin
