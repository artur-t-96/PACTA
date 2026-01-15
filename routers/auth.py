from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from itsdangerous import URLSafeSerializer

import config

router = APIRouter(tags=["auth"])
templates = Jinja2Templates(directory="templates")
serializer = URLSafeSerializer(config.SECRET_KEY)


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Strona logowania"""
    # Jeśli już zalogowany, przekieruj
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if session:
        try:
            serializer.loads(session)
            return RedirectResponse(url="/generator", status_code=302)
        except:
            pass
    
    return templates.TemplateResponse("login.html", {
        "request": request,
        "app_name": config.APP_NAME,
        "error": None
    })


@router.post("/login")
async def login(request: Request, login: str = Form(...), password: str = Form(...)):
    """Weryfikacja logowania"""
    if login == config.LOGIN and password == config.PASSWORD:
        # Tworzenie sesji
        session_data = serializer.dumps({"user": login})
        response = RedirectResponse(url="/generator", status_code=302)
        response.set_cookie(
            key=config.SESSION_COOKIE_NAME,
            value=session_data,
            max_age=config.SESSION_MAX_AGE,
            httponly=True,
            samesite="lax"
        )
        return response
    
    # Błędne dane logowania
    return templates.TemplateResponse("login.html", {
        "request": request,
        "app_name": config.APP_NAME,
        "error": "Nieprawidłowy login lub hasło"
    })


@router.get("/logout")
async def logout():
    """Wylogowanie"""
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie(config.SESSION_COOKIE_NAME)
    return response
