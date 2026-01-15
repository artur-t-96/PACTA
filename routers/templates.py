"""
Templates Router - CRUD operations for document templates.
"""
import logging
from io import BytesIO
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config
from database import get_db
from models.template import DocumentTemplate
from services import document_service

router = APIRouter(tags=["templates"])
logger = logging.getLogger(__name__)


def verify_session(request: Request):
    """Sprawdza czy uzytkownik jest zalogowany"""
    session = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session:
        raise HTTPException(status_code=401, detail="Nie zalogowano")


class TemplateUpdateRequest(BaseModel):
    """Request body for updating template metadata."""
    name: Optional[str] = None
    description: Optional[str] = None
    field_labels: Optional[Dict[str, str]] = None


class GenerateDocumentRequest(BaseModel):
    """Request body for generating a document from template."""
    data: Dict[str, Any]


# ============================================
# Template CRUD Endpoints
# ============================================

@router.post("/templates/upload")
async def upload_template(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    db: Session = Depends(get_db)
):
    """
    Upload a new document template.

    - Accepts .docx file with {{FIELD_NAME}} placeholders
    - Parses document and detects all fields
    - Saves file to persistent disk
    - Creates database record with metadata

    Returns:
        Template details with detected fields
    """
    verify_session(request)

    # Validate file type
    if not file.filename.endswith('.docx'):
        raise HTTPException(
            status_code=400,
            detail="Tylko pliki .docx sa dozwolone"
        )

    try:
        # Read file content
        content = await file.read()

        # Save file and extract fields
        file_path, fields = document_service.save_template_file(content, file.filename)

        # Create database record
        template = DocumentTemplate(
            name=name,
            description=description,
            file_path=file_path,
            original_filename=file.filename,
            fields=fields,
            field_labels={}
        )

        db.add(template)
        db.commit()
        db.refresh(template)

        logger.info(f"Template uploaded: {template.id} - {name}")

        return JSONResponse(content={
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "fields": template.fields,
            "original_filename": template.original_filename,
            "created_at": template.created_at.isoformat() if template.created_at else None
        })

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading template: {e}")
        raise HTTPException(status_code=500, detail=f"Blad podczas uploadu: {str(e)}")


@router.get("/templates")
async def list_templates(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get list of all templates with their fields.

    Returns:
        List of templates with metadata
    """
    verify_session(request)

    templates = db.query(DocumentTemplate).order_by(DocumentTemplate.created_at.desc()).all()

    return JSONResponse(content={
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "fields": t.fields,
                "field_count": len(t.fields) if t.fields else 0,
                "original_filename": t.original_filename,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in templates
        ]
    })


@router.get("/templates/{template_id}")
async def get_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get template details including fields and labels.

    Returns:
        Full template details with field labels
    """
    verify_session(request)

    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")

    return JSONResponse(content={
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "fields": template.fields,
        "field_labels": template.field_labels or {},
        "fields_with_labels": template.get_fields_with_labels(),
        "original_filename": template.original_filename,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None
    })


@router.put("/templates/{template_id}")
async def update_template(
    template_id: int,
    update_data: TemplateUpdateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Update template metadata (name, description, field labels).

    Note: Cannot update the template file itself - upload a new template instead.
    """
    verify_session(request)

    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")

    # Update fields
    if update_data.name is not None:
        template.name = update_data.name
    if update_data.description is not None:
        template.description = update_data.description
    if update_data.field_labels is not None:
        template.field_labels = update_data.field_labels

    db.commit()
    db.refresh(template)

    logger.info(f"Template updated: {template_id}")

    return JSONResponse(content={
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "field_labels": template.field_labels,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None
    })


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete a template (file from disk and record from database).
    """
    verify_session(request)

    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")

    try:
        # Delete file from disk
        document_service.delete_template_file(template.file_path)

        # Delete database record
        db.delete(template)
        db.commit()

        logger.info(f"Template deleted: {template_id}")

        return JSONResponse(content={"message": "Szablon usuniety", "id": template_id})

    except Exception as e:
        logger.error(f"Error deleting template {template_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Blad usuwania szablonu: {str(e)}")


# ============================================
# Document Generation Endpoint
# ============================================

@router.post("/templates/{template_id}/generate")
async def generate_document(
    template_id: int,
    body: GenerateDocumentRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Generate a document from template with provided field values.

    Args:
        template_id: ID of the template to use
        body: JSON with field values

    Returns:
        Generated .docx file for download
    """
    verify_session(request)

    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")

    # Validate required fields
    missing_fields = document_service.validate_template_fields(
        template.fields or [],
        body.data
    )

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Brakujace pola: {', '.join(missing_fields)}"
        )

    try:
        # Generate document
        doc_bytes = document_service.generate_document_from_template(
            template.file_path,
            body.data
        )

        # Prepare filename
        base_name = template.original_filename or f"template_{template_id}"
        if base_name.endswith('.docx'):
            base_name = base_name[:-5]
        filename = f"{base_name}_wygenerowany.docx"

        return StreamingResponse(
            BytesIO(doc_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Plik szablonu nie istnieje na dysku")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating document from template {template_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Blad generowania: {str(e)}")


@router.get("/templates/{template_id}/download")
async def download_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Download the original template file.
    """
    verify_session(request)

    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Szablon nie znaleziony")

    try:
        with open(template.file_path, 'rb') as f:
            content = f.read()

        filename = template.original_filename or f"template_{template_id}.docx"

        return StreamingResponse(
            BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Plik szablonu nie istnieje na dysku")
