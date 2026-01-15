"""
Document Template model for storing template metadata.
"""
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func

from database import Base


class DocumentTemplate(Base):
    """Model for document templates stored on disk."""

    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=True)
    fields = Column(JSON, nullable=False, default=list)
    field_labels = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "file_path": self.file_path,
            "original_filename": self.original_filename,
            "fields": self.fields or [],
            "field_labels": self.field_labels or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def get_field_label(self, field: str) -> str:
        """Get human-readable label for a field."""
        if self.field_labels and field in self.field_labels:
            return self.field_labels[field]
        # Auto-format: IMIE_NAZWISKO -> Imie nazwisko
        return field.replace("_", " ").capitalize()

    def get_fields_with_labels(self) -> List[Dict[str, str]]:
        """Get fields with their labels."""
        return [
            {"field": f, "label": self.get_field_label(f)}
            for f in (self.fields or [])
        ]
