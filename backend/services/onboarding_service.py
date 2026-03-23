"""
Onboarding service — automated contractor onboarding flow
Flow: Generate → Validate → Sign → Email → Activate
"""
import json
from database import SessionLocal, Contract, ContractAuditLog
from services.ai_service import standardize_it_area
from services.docx_service import generate_contract_docx
from services.contract_numbering import generate_contract_number
from services.email_service import generate_welcome_email


def run_onboarding(data: dict) -> dict:
    """
    Full automated onboarding:
    1. Generate contract
    2. Validate data
    3. Set status to do_podpisu
    4. Generate welcome email (preview)
    5. Return complete package
    """
    db = SessionLocal()
    results = {"steps": [], "success": True, "errors": []}
    
    try:
        # Step 1: Standardize IT area
        it_area = standardize_it_area(data.get("obszar_it", ""))
        results["steps"].append({"step": "IT area", "result": it_area})
        
        # Step 2: Generate number
        number = generate_contract_number(db)
        results["steps"].append({"step": "Number", "result": number})
        
        # Step 3: Generate DOCX
        file_path = generate_contract_docx(
            contract_number=number,
            imie=data["imie"], nazwisko=data["nazwisko"],
            firma=data["firma"], nip=data["nip"],
            regon=data.get("regon", ""), adres=data["adres"],
            email=data["email"], tel=data["tel"],
            rola=data["rola"], stawka=float(data["stawka"]),
            klient=data["klient"], data_startu=data["data_startu"],
            it_area=it_area,
            opis_projektu=data.get("opis_projektu", ""),
            miasto_klienta=data["miasto_klienta"],
        )
        results["steps"].append({"step": "DOCX", "result": file_path})
        
        # Step 4: Save to database
        contract = Contract(
            number=number,
            contractor_name=f"{data['imie']} {data['nazwisko']}",
            contractor_firstname=data["imie"],
            contractor_lastname=data["nazwisko"],
            contractor_company=data["firma"],
            contractor_nip=data["nip"],
            contractor_regon=data.get("regon", ""),
            contractor_address=data["adres"],
            contractor_email=data["email"],
            contractor_phone=data["tel"],
            client=data["klient"],
            role=data["rola"],
            rate=float(data["stawka"]),
            it_area=it_area,
            it_area_raw=data.get("obszar_it", ""),
            project_description=data.get("opis_projektu", ""),
            client_city=data["miasto_klienta"],
            start_date=data["data_startu"],
            status="do_podpisu",  # Skip draft, go straight to signing
            file_path=file_path,
        )
        db.add(contract)
        db.flush()
        results["steps"].append({"step": "Database", "result": f"ID: {contract.id}"})
        
        # Step 5: Audit log
        db.add(ContractAuditLog(
            contract_id=contract.id, action="created",
            details=json.dumps({"number": number, "via": "onboarding"}),
        ))
        db.add(ContractAuditLog(
            contract_id=contract.id, action="status_changed",
            details=json.dumps({"from": "draft", "to": "do_podpisu", "auto": True}),
        ))
        
        # Step 6: Generate welcome email preview
        db.commit()
        db.refresh(contract)
        email = generate_welcome_email(contract)
        results["steps"].append({"step": "Email preview", "result": email["subject"]})
        
        # Step 7: Validation
        issues = []
        if not data.get("nip") or len(data["nip"].replace("-", "")) != 10:
            issues.append("NIP nieprawidłowy")
        if not data.get("email") or "@" not in data["email"]:
            issues.append("Email nieprawidłowy")
        if float(data.get("stawka", 0)) <= 0:
            issues.append("Brak stawki")
        
        results["contract_id"] = contract.id
        results["number"] = number
        results["file_path"] = file_path
        results["email_preview"] = email
        results["validation_issues"] = issues
        results["status"] = "do_podpisu"
        results["message"] = f"Umowa {number} gotowa do podpisu. {'⚠️ ' + ', '.join(issues) if issues else '✅ Dane kompletne.'}"
        
    except Exception as e:
        results["success"] = False
        results["errors"].append(str(e))
        db.rollback()
    finally:
        db.close()
    
    return results
