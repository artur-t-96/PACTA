import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

import config
from routers import auth, ceidg, chat, contract, templates
from database import init_db, check_db_connection
from services.document_service import ensure_storage_dirs

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hooks for application startup and shutdown."""
    # Startup
    logger.info("Starting PACTA application...")

    # Ensure storage directories exist
    ensure_storage_dirs()

    # Initialize database
    if check_db_connection():
        init_db()
        logger.info("Database initialized successfully")
    else:
        logger.warning("Database connection not available - running in limited mode")

    yield

    # Shutdown
    logger.info("Shutting down PACTA application...")


# Inicjalizacja aplikacji
app = FastAPI(
    title=config.APP_NAME,
    description=config.APP_DESCRIPTION,
    version=config.APP_VERSION,
    lifespan=lifespan
)

# Montowanie statycznych plików
app.mount("/static", StaticFiles(directory="static"), name="static")

# Szablony Jinja2
jinja_templates = Jinja2Templates(directory="templates")

# Rejestracja routerów
app.include_router(auth.router)
app.include_router(ceidg.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(contract.router, prefix="/api")
app.include_router(templates.router, prefix="/api")


@app.get("/")
async def root(request: Request):
    """Przekierowanie na stronę główną"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if session:
        return RedirectResponse(url="/generator", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@app.get("/generator")
async def generator_page(request: Request):
    """Strona generatora umow B2B"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        return RedirectResponse(url="/login", status_code=302)

    return jinja_templates.TemplateResponse("generator.html", {
        "request": request,
        "app_name": config.APP_NAME
    })


@app.get("/admin/templates")
async def admin_templates_page(request: Request):
    """Strona administracji szablonami dokumentow"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        return RedirectResponse(url="/login", status_code=302)

    return jinja_templates.TemplateResponse("admin_templates.html", {
        "request": request,
        "app_name": config.APP_NAME
    })


@app.get("/documents/generate")
async def documents_generate_page(request: Request):
    """Strona generowania dokumentow z szablonow"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        return RedirectResponse(url="/login", status_code=302)

    return jinja_templates.TemplateResponse("document_generator.html", {
        "request": request,
        "app_name": config.APP_NAME
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
