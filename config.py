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

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/pacta")

# Storage paths (Persistent Disk)
TEMPLATES_DIR = os.getenv("TEMPLATES_DIR", "/var/data/templates")
GENERATED_DIR = os.getenv("GENERATED_DIR", "/var/data/generated")

# App
APP_NAME = "PACTA"
APP_VERSION = "1.1.0"
APP_DESCRIPTION = "Partner And Contract Transaction Assistant"

# Session
SESSION_COOKIE_NAME = "pacta_session"
SESSION_MAX_AGE = 60 * 60 * 8  # 8 godzin
