"""
Email service — generate welcome emails and contract notifications
"""
from database import Contract


def generate_welcome_email(contract: Contract) -> dict:
    """Generate welcome email content for a new contractor."""
    
    subject = f"Witamy w B2B.net S.A. — Umowa {contract.number}"
    
    body_html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">B2B.net S.A.</h1>
    <p style="margin: 5px 0; opacity: 0.8;">Witamy na pokładzie!</p>
  </div>
  
  <div style="padding: 30px;">
    <p>Szanowny/a <strong>{contract.contractor_name}</strong>,</p>
    
    <p>Z przyjemnością potwierdzamy nawiązanie współpracy. Poniżej szczegóły Twojej umowy:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #F3F4F6;">
        <td style="padding: 10px; font-weight: bold;">Numer umowy</td>
        <td style="padding: 10px;">{contract.number}</td>
      </tr>
      <tr>
        <td style="padding: 10px; font-weight: bold;">Klient</td>
        <td style="padding: 10px;">{contract.client}</td>
      </tr>
      <tr style="background: #F3F4F6;">
        <td style="padding: 10px; font-weight: bold;">Stanowisko</td>
        <td style="padding: 10px;">{contract.role}</td>
      </tr>
      <tr>
        <td style="padding: 10px; font-weight: bold;">Stawka</td>
        <td style="padding: 10px;">{contract.rate:.2f} PLN/h netto</td>
      </tr>
      <tr style="background: #F3F4F6;">
        <td style="padding: 10px; font-weight: bold;">Data rozpoczęcia</td>
        <td style="padding: 10px;">{contract.start_date}</td>
      </tr>
    </table>
    
    <p>W razie pytań prosimy o kontakt:</p>
    <ul>
      <li>📧 administracja@b2bnet.pl</li>
      <li>📞 +48 22 XXX XXX</li>
    </ul>
    
    <p>Z poważaniem,<br>
    <strong>Zespół B2B.net S.A.</strong><br>
    Al. Jerozolimskie 180, 02-486 Warszawa</p>
  </div>
  
  <div style="background: #F9FAFB; padding: 15px; text-align: center; font-size: 12px; color: #9CA3AF;">
    B2B.net S.A. | KRS 0000387063 | NIP 5711707392
  </div>
</body>
</html>
"""
    
    body_text = f"""
Szanowny/a {contract.contractor_name},

Witamy w B2B.net S.A.!

Szczegóły umowy:
- Numer: {contract.number}
- Klient: {contract.client}
- Stanowisko: {contract.role}
- Stawka: {contract.rate:.2f} PLN/h netto
- Data rozpoczęcia: {contract.start_date}

Z poważaniem,
Zespół B2B.net S.A.
"""
    
    return {
        "to": contract.contractor_email,
        "subject": subject,
        "body_html": body_html,
        "body_text": body_text.strip(),
    }


def generate_contract_reminder(contract: Contract) -> dict:
    """Generate reminder email to sign the contract."""
    return {
        "to": contract.contractor_email,
        "subject": f"Przypomnienie: Umowa {contract.number} oczekuje na podpis",
        "body_text": f"""
Szanowny/a {contract.contractor_name},

Przypominamy, że umowa nr {contract.number} z B2B.net S.A. oczekuje na Twój podpis.

Klient: {contract.client}
Stanowisko: {contract.role}
Data startu: {contract.start_date}

Prosimy o kontakt w celu podpisania dokumentów.

Z poważaniem,
Administracja B2B.net S.A.
""".strip(),
    }
