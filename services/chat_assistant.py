import json
from typing import Dict, Any, List
from anthropic import Anthropic

import config
from data.knowledge_base import (
    SYSTEM_PROMPT,
    EDITABLE_FIELDS,
    NON_EDITABLE_FIELDS,
    PARAGRAPHS_EXPLANATIONS,
    FAQ
)


class ChatAssistant:
    """Asystent AI do wyjaśniania umów i modyfikacji formularza"""
    
    def __init__(self):
        self.client = Anthropic(api_key=config.ANTHROPIC_API_KEY) if config.ANTHROPIC_API_KEY else None
    
    async def process_message(
        self,
        message: str,
        form_data: Dict[str, Any],
        chat_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Przetwarza wiadomość użytkownika i zwraca odpowiedź.
        
        Args:
            message: Pytanie/polecenie użytkownika
            form_data: Aktualny stan formularza
            chat_history: Historia rozmowy
        
        Returns:
            {
                "reply": "Odpowiedź chatbota",
                "form_updates": {"pole": "wartość"} lub None
            }
        """
        
        # Jeśli brak klucza API, użyj trybu offline
        if not self.client:
            return self._offline_response(message)
        
        # Budowanie kontekstu
        context = self._build_context(form_data)
        
        # Przygotowanie wiadomości dla Claude
        messages = self._prepare_messages(chat_history, message)
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=SYSTEM_PROMPT + "\n\n" + context,
                messages=messages
            )
            
            # Parsowanie odpowiedzi
            return self._parse_response(response.content[0].text)
            
        except Exception as e:
            return {
                "reply": f"⚠️ Przepraszam, wystąpił błąd: {str(e)}. Spróbuj ponownie.",
                "form_updates": None
            }
    
    def _build_context(self, form_data: Dict[str, Any]) -> str:
        """Buduje kontekst z aktualnym stanem formularza"""
        
        context_parts = [
            "AKTUALNY STAN FORMULARZA:",
            json.dumps(form_data, ensure_ascii=False, indent=2),
            "",
            "POLA EDYTOWALNE:",
            json.dumps(list(EDITABLE_FIELDS.keys()), ensure_ascii=False),
            "",
            "POLA NIEEDYTOWALNE (ODMÓW GRZECZNIE):",
            "- Kary umowne (50 000 zł za poufność, 100 000 zł za konkurencję)",
            "- Zakaz konkurencji (12 miesięcy)",
            "- Prawa autorskie (pełne przeniesienie)",
            "- Zapisy RODO",
            "",
            "WYJAŚNIENIA PARAGRAFÓW:",
            json.dumps(PARAGRAPHS_EXPLANATIONS, ensure_ascii=False, indent=2),
            "",
            "FAQ:",
            json.dumps(FAQ, ensure_ascii=False, indent=2)
        ]
        
        return "\n".join(context_parts)
    
    def _prepare_messages(
        self, 
        chat_history: List[Dict[str, str]], 
        current_message: str
    ) -> List[Dict[str, str]]:
        """Przygotowuje listę wiadomości dla API"""
        
        messages = []
        
        # Dodaj historię (ostatnie 10 wiadomości)
        for msg in chat_history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Dodaj aktualną wiadomość
        messages.append({
            "role": "user",
            "content": current_message
        })
        
        return messages
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parsuje odpowiedź Claude do słownika"""
        
        try:
            # Próba parsowania jako JSON
            # Claude może zwrócić JSON w bloku ```json lub bezpośrednio
            clean_text = response_text.strip()
            
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            
            clean_text = clean_text.strip()
            
            result = json.loads(clean_text)
            
            # Walidacja struktury
            if "reply" not in result:
                result["reply"] = response_text
            if "form_updates" not in result:
                result["form_updates"] = None
            
            # Walidacja form_updates
            if result["form_updates"]:
                valid_updates = {}
                for key, value in result["form_updates"].items():
                    if key in EDITABLE_FIELDS:
                        valid_updates[key] = value
                result["form_updates"] = valid_updates if valid_updates else None
            
            return result
            
        except json.JSONDecodeError:
            # Jeśli nie JSON, zwróć jako tekst
            return {
                "reply": response_text,
                "form_updates": None
            }
    
    def _offline_response(self, message: str) -> Dict[str, Any]:
        """Odpowiedź offline gdy brak klucza API"""
        
        message_lower = message.lower()
        
        # Proste dopasowanie słów kluczowych
        if any(word in message_lower for word in ["§5", "prawa autorskie", "własność", "kod"]):
            return {
                "reply": PARAGRAPHS_EXPLANATIONS["§5"]["wyjasnienie"],
                "form_updates": None
            }
        
        if any(word in message_lower for word in ["§10", "konkurencj", "zakaz"]):
            return {
                "reply": PARAGRAPHS_EXPLANATIONS["§10"]["wyjasnienie"],
                "form_updates": None
            }
        
        if any(word in message_lower for word in ["§8", "poufn", "tajemnic"]):
            return {
                "reply": PARAGRAPHS_EXPLANATIONS["§8"]["wyjasnienie"],
                "form_updates": None
            }
        
        if any(word in message_lower for word in ["kara", "50000", "100000"]):
            return {
                "reply": """⚠️ Kary umowne NIE podlegają negocjacji:
                
• 50 000 zł - za nieprzystąpienie do pracy lub porzucenie zlecenia
• 50 000 zł - za naruszenie poufności (§8)
• 100 000 zł - za złamanie zakazu konkurencji (§10)

Kary są ustalone przez dział prawny i chronią interesy B2BNET oraz klientów.""",
                "form_updates": None
            }
        
        # Zmiana okresu wypowiedzenia - MUSI BYĆ PRZED informacją o okresie
        if "zmień" in message_lower and ("2 miesi" in message_lower or "dwa miesi" in message_lower):
            return {
                "reply": "✅ Zmieniłem okres wypowiedzenia na 2 miesiące.",
                "form_updates": {"okres_wypowiedzenia": "2 miesięcy"}
            }
        
        if "zmień" in message_lower and ("3 miesi" in message_lower or "trzy miesi" in message_lower):
            return {
                "reply": "✅ Zmieniłem okres wypowiedzenia na 3 miesiące.",
                "form_updates": {"okres_wypowiedzenia": "3 miesięcy"}
            }
        
        if any(word in message_lower for word in ["wypowiedz", "okres"]):
            return {
                "reply": """📝 Okres wypowiedzenia:

Domyślnie: 1 miesiąc ze skutkiem na koniec miesiąca kalendarzowego.

Mogę zmienić na: 2 lub 3 miesiące.

Czy chcesz zmienić okres wypowiedzenia? Napisz np. "zmień na 2 miesiące".""",
                "form_updates": None
            }
        
        # Domyślna odpowiedź
        return {
            "reply": """👋 Cześć! Jestem asystentem PACTA.

Mogę Ci pomóc z:
• 📝 Wyjaśnieniem zapisów umowy (np. "Co oznacza §5?")
• ⚙️ Zmianą parametrów (np. "Zmień okres wypowiedzenia na 2 miesiące")
• ❓ Odpowiedzią na pytania (np. "Czy mogę mieć innych klientów?")

O co chcesz zapytać?""",
            "form_updates": None
        }
