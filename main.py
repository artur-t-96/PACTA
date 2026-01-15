from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

import config
from routers import auth, ceidg, chat, contract

# Inicjalizacja aplikacji
app = FastAPI(
    title=config.APP_NAME,
    description=config.APP_DESCRIPTION,
    version=config.APP_VERSION
)

# Montowanie statycznych plików
app.mount("/static", StaticFiles(directory="static"), name="static")

# Szablony Jinja2
templates = Jinja2Templates(directory="templates")

# Rejestracja routerów
app.include_router(auth.router)
app.include_router(ceidg.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(contract.router, prefix="/api")


@app.get("/")
async def root(request: Request):
    """Przekierowanie na stronę główną"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if session:
        return RedirectResponse(url="/generator", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@app.get("/generator")
async def generator_page(request: Request):
    """Strona generatora umów"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    
    return templates.TemplateResponse("generator.html", {
        "request": request,
        "app_name": config.APP_NAME
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
