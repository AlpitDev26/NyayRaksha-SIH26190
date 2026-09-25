from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class EntitySuggestion(BaseModel):
    category: str  # PERSON, LOCATION, DATE, CASE_NUMBER, PHONE, IDENTIFIER
    text: str
    confidence: float
    is_sensitive: bool = False


class AISuggestionResponse(BaseModel):
    document_id: str
    extracted_text_preview: str
    suggested_classification: str
    suggested_document_type: str
    suggested_tags: List[str] = []
    entities: List[EntitySuggestion] = []
    pii_redaction_targets: List[str] = []
    disclaimer: str = "AI-generated suggestion — human review required. Do not use without verification."


class RedactionApplyRequest(BaseModel):
    items_to_redact: List[str]
    justification: str
    derived_title: str
