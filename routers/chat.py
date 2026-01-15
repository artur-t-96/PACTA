from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

import config
from services.chat_assistant import ChatAssistant

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    form_data: Dict[str, Any] = {}
    chat_history: list = []


class ChatResponse(BaseModel):
    reply: str
    form_updates: Optional[Dict[str, Any]] = None


def verify_session(request: Request):
    """Sprawdza czy użytkownik jest zalogowany"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        raise HTTPException(status_code=401, detail="Nie zalogowano")


@router.post("/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, request: Request):
    """
    Endpoint chatbota.
    
    Przyjmuje:
        - message: pytanie użytkownika
        - form_data: aktualny stan formularza
        - chat_history: historia rozmowy
    
    Zwraca:
        - reply: odpowiedź chatbota
        - form_updates: opcjonalne zmiany do wprowadzenia w formularzu
    """
    verify_session(request)
    
    if not chat_request.message.strip():
        raise HTTPException(status_code=400, detail="Puste pytanie")
    
    assistant = ChatAssistant()
    
    try:
        result = await assistant.process_message(
            message=chat_request.message,
            form_data=chat_request.form_data,
            chat_history=chat_request.chat_history
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd chatbota: {str(e)}")
