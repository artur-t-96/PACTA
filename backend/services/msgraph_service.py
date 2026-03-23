"""
Microsoft Graph email service — send emails via Outlook/M365
Requires: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET in .env
Or: MS365_ACCESS_TOKEN from existing token management
"""
import os
import requests

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
MS365_SENDER = os.getenv("MS365_SENDER_EMAIL", "administracja@b2bnet.pl")


def _get_token() -> str:
    """Get Microsoft Graph access token."""
    # Try existing token from ms365_tokens.json
    token_path = os.path.expanduser("~/.secrets/ms365_tokens.json")
    if os.path.exists(token_path):
        import json
        with open(token_path) as f:
            tokens = json.load(f)
        return tokens.get("access_token", "")
    
    # Try environment variable
    return os.getenv("MS365_ACCESS_TOKEN", "")


def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> dict:
    """Send email via Microsoft Graph."""
    token = _get_token()
    if not token:
        return {
            "success": False,
            "error": "No MS365 token. Run: python3 ~/clawd/scripts/ms365_refresh.py",
        }
    
    payload = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": body_html},
            "toRecipients": [{"emailAddress": {"address": to}}],
            "from": {"emailAddress": {"address": MS365_SENDER}},
        },
        "saveToSentItems": True,
    }
    
    try:
        r = requests.post(
            f"{GRAPH_BASE}/me/sendMail",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )
        
        if r.status_code == 202:
            return {"success": True, "message": f"Email sent to {to}"}
        else:
            return {"success": False, "error": r.text[:200], "status_code": r.status_code}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


def is_configured() -> bool:
    return bool(_get_token())
