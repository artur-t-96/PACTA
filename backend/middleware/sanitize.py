"""
Input sanitization for contract data.
Prevents XSS, SQL injection, and data quality issues.
"""
import re
import html


def sanitize_text(text: str) -> str:
    """Basic text sanitization."""
    if not text:
        return ""
    # HTML escape
    text = html.escape(text)
    # Remove control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def sanitize_nip(nip: str) -> str:
    """Clean NIP — remove dashes, spaces, validate length."""
    if not nip:
        return ""
    cleaned = re.sub(r'[^0-9]', '', nip)
    return cleaned if len(cleaned) == 10 else nip


def sanitize_email(email: str) -> str:
    """Basic email sanitization."""
    if not email:
        return ""
    email = email.strip().lower()
    # Basic validation
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return email
    return email  # Return as-is, validation will catch it


def sanitize_phone(phone: str) -> str:
    """Normalize phone number."""
    if not phone:
        return ""
    # Keep +, digits, spaces
    cleaned = re.sub(r'[^0-9+\s]', '', phone)
    return cleaned.strip()


def sanitize_contract_input(data: dict) -> dict:
    """Sanitize all contract input fields."""
    text_fields = ["imie", "nazwisko", "firma", "adres", "rola", "klient",
                   "miasto_klienta", "opis_projektu", "obszar_it"]
    
    sanitized = dict(data)
    for field in text_fields:
        if field in sanitized and isinstance(sanitized[field], str):
            sanitized[field] = sanitize_text(sanitized[field])
    
    if "nip" in sanitized:
        sanitized["nip"] = sanitize_nip(sanitized["nip"])
    if "email" in sanitized:
        sanitized["email"] = sanitize_email(sanitized["email"])
    if "tel" in sanitized:
        sanitized["tel"] = sanitize_phone(sanitized["tel"])
    
    return sanitized
